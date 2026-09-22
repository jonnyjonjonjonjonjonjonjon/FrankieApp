import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore'
import { getBytes, getStorage, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage'
import * as db from './db'
import { firebaseConfig } from './firebaseConfig'
import { setRemoteBlobFetcher } from './images'
import { store } from './store'

/**
 * Cloud sync (PRD §4.12) on Firebase.
 *
 * - Local IndexedDB stays the source the screens read from, so the app works
 *   offline; every local write is pushed to Firestore (the SDK queues writes
 *   while offline) and every remote change is written back locally,
 *   last-write-wins on `updatedAt`.
 * - Photos go to Cloud Storage from an outbox that retries when online.
 * - Access: Google sign-in, and the signed-in email must exist in the
 *   `members` collection (enforced by firestore.rules / storage.rules).
 */

export type SyncStatus = 'off' | 'starting' | 'signed-out' | 'not-member' | 'ready'

export interface Member {
  email: string
  name: string
  addedAt: string
}

const COLLECTIONS: db.Collection[] = ['items', 'events', 'days', 'photos', 'settings']

class Sync {
  status: SyncStatus = firebaseConfig ? 'starting' : 'off'
  user: User | null = null
  members: Member[] = []
  lastError: string | null = null
  online = navigator.onLine

  private app: FirebaseApp | null = null
  private auth: Auth | null = null
  private fs: Firestore | null = null
  private storage: FirebaseStorage | null = null
  private unsubs: Unsubscribe[] = []
  private flushing = false
  private listeners = new Set<() => void>()

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }
  private emit() {
    this.listeners.forEach(fn => fn())
  }
  private setStatus(status: SyncStatus, error: string | null = null) {
    this.status = status
    this.lastError = error
    this.emit()
  }

  get enabled() {
    return this.status !== 'off'
  }

  start() {
    if (!firebaseConfig) return
    this.app = initializeApp(firebaseConfig)
    this.auth = getAuth(this.app)
    this.fs = initializeFirestore(this.app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
    this.storage = getStorage(this.app)

    window.addEventListener('online', () => {
      this.online = true
      this.emit()
      void this.flushOutbox()
    })
    window.addEventListener('offline', () => {
      this.online = false
      this.emit()
    })

    onAuthStateChanged(this.auth, user => {
      this.user = user
      this.stopListening()
      if (!user) {
        this.setStatus('signed-out')
        return
      }
      void this.checkMembership()
    })
  }

  // ---------- auth ----------

  async signIn() {
    if (!this.auth) return
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    try {
      await signInWithPopup(this.auth, provider)
    } catch {
      // Popups are blocked in some installed-app contexts; fall back to a redirect.
      await signInWithRedirect(this.auth, provider)
    }
  }

  async signOut() {
    if (!this.auth) return
    await fbSignOut(this.auth)
  }

  async checkMembership() {
    const email = this.user?.email?.toLowerCase()
    if (!this.fs || !email) {
      this.setStatus('signed-out')
      return
    }
    try {
      const snap = await getDoc(doc(this.fs, 'members', email))
      if (!snap.exists()) {
        this.setStatus('not-member')
        return
      }
    } catch (e) {
      // Rules deny reads to non-members, which surfaces as permission-denied.
      const code = (e as { code?: string }).code ?? ''
      if (code.includes('permission')) {
        this.setStatus('not-member')
        return
      }
      this.setStatus('not-member', String(e))
      return
    }
    this.setStatus('ready')
    this.listen()
    setRemoteBlobFetcher(id => this.fetchBlob(id))
    db.setWriteHooks(
      (coll, record) => void this.push(coll, record),
      () => void this.flushOutbox(),
    )
    void this.flushOutbox()
  }

  // ---------- inbound ----------

  private listen() {
    if (!this.fs) return
    for (const coll of COLLECTIONS) {
      const unsub = onSnapshot(
        collection(this.fs, coll),
        snap => {
          for (const change of snap.docChanges()) {
            if (change.type === 'removed') continue
            // Our own pending writes come back through here too; skip them.
            if (change.doc.metadata.hasPendingWrites) continue
            void this.applyRemote(coll, change.doc.data() as db.Record_)
          }
        },
        err => {
          const code = (err as { code?: string }).code ?? ''
          if (code.includes('permission')) this.setStatus('not-member')
          else this.setStatus(this.status, String(err))
        },
      )
      this.unsubs.push(unsub)
    }
    this.unsubs.push(
      onSnapshot(collection(this.fs, 'members'), snap => {
        this.members = snap.docs
          .map(d => d.data() as Member)
          .sort((a, b) => a.addedAt.localeCompare(b.addedAt))
        this.emit()
      }),
    )
  }

  private stopListening() {
    this.unsubs.forEach(u => u())
    this.unsubs = []
    db.setWriteHooks(null, null)
    setRemoteBlobFetcher(null)
  }

  private async applyRemote(coll: db.Collection, record: db.Record_) {
    const local = store.localRecord(coll, record)
    const remoteStamp = (record as { updatedAt?: string }).updatedAt ?? ''
    const localStamp = (local as { updatedAt?: string } | null)?.updatedAt ?? ''
    if (local && remoteStamp <= localStamp) return
    switch (coll) {
      case 'items':
        await db.putItem(record as never, true)
        break
      case 'events':
        await db.putEvent(record as never, true)
        break
      case 'days':
        await db.putDay(record as never, true)
        break
      case 'photos':
        await db.putPhoto(record as never, true)
        break
      case 'settings':
        await db.putSettings(record as never, true)
        break
    }
    store.applyRemote(coll, record)
  }

  // ---------- outbound ----------

  private async push(coll: db.Collection, record: db.Record_) {
    if (!this.fs || this.status !== 'ready') return
    const id = coll === 'days' ? (record as { date: string }).date : (record as { id: string }).id
    try {
      await setDoc(doc(this.fs, coll, id), record)
    } catch (e) {
      this.setStatus(this.status, String(e))
    }
  }

  async flushOutbox() {
    if (!this.storage || this.status !== 'ready' || this.flushing || !navigator.onLine) return
    this.flushing = true
    try {
      for (const id of await db.outboxIds()) {
        const blob = await db.getBlob(id)
        if (blob) await uploadBytes(ref(this.storage, `photos/${id}.jpg`), blob, { contentType: blob.type || 'image/jpeg' })
        await db.outboxDone(id)
      }
    } catch (e) {
      this.setStatus(this.status, String(e))
    } finally {
      this.flushing = false
    }
  }

  private async fetchBlob(id: string): Promise<Blob | null> {
    if (!this.storage || this.status !== 'ready') return null
    try {
      const bytes = await getBytes(ref(this.storage, `photos/${id}.jpg`))
      const blob = new Blob([bytes], { type: 'image/jpeg' })
      await db.putBlob(id, blob, true)
      return blob
    } catch {
      return null
    }
  }

  // ---------- members ----------

  async addMember(email: string, name: string) {
    if (!this.fs) return
    const key = email.trim().toLowerCase()
    if (!key.includes('@')) return
    await setDoc(doc(this.fs, 'members', key), { email: key, name: name.trim() || key, addedAt: new Date().toISOString() })
  }

  async removeMember(email: string) {
    if (!this.fs) return
    if (email === this.user?.email?.toLowerCase()) return // never lock yourself out
    await deleteDoc(doc(this.fs, 'members', email))
  }

  async refreshMembers() {
    if (!this.fs) return
    const snap = await getDocs(collection(this.fs, 'members'))
    this.members = snap.docs.map(d => d.data() as Member)
    this.emit()
  }
}

export const sync = new Sync()
