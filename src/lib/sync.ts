import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  Bytes,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  setDoc,
  where,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore'
import * as db from './db'
import { firebaseConfig } from './firebaseConfig'
import { setRemoteBlobFetcher } from './images'
import { store } from './store'
import { setUsagePusher } from './usage'
import type { ISODate, UsageDay } from '../types'

/**
 * Cloud sync (PRD §4.12) on Firebase.
 *
 * - Local IndexedDB stays the source the screens read from, so the app works
 *   offline; every local write is pushed to Firestore (the SDK queues writes
 *   while offline) and every remote change is written back locally,
 *   last-write-wins on `updatedAt`.
 * - Photo bytes live in Firestore too (collection `blobs`, one doc per photo,
 *   under the 1 MB doc limit because images.ts shrinks them), pushed from an
 *   outbox that retries when online. This avoids Cloud Storage, which needs a
 *   billing account on new projects.
 * - Usage stats (collection `usage`, one doc per device per day) are pushed
 *   by usage.ts through setUsagePusher and only read on request by the
 *   stats screen (fetchUsage): no listener, so they never stream in.
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
    } catch (e) {
      // Never fall back to signInWithRedirect: on GitHub Pages the auth handler
      // lives on a different origin and modern Chrome's storage partitioning
      // loses the redirect state ("missing initial state").
      const code = (e as { code?: string }).code ?? ''
      if (code.includes('popup-closed') || code.includes('cancelled')) return
      this.setStatus(this.status, code.includes('popup-blocked') ? 'The sign-in window was blocked. Allow pop-ups for this site and try again.' : String(e))
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
        // The read was allowed but there is no entry: the rules let this account
        // in as the project owner (isOwner in firestore.rules). Add it to the
        // family list so it shows up like everyone else.
        await setDoc(doc(this.fs, 'members', email), {
          email,
          name: this.user?.displayName?.split(' ')[0] || email,
          addedAt: new Date().toISOString(),
        })
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
    setUsagePusher(u => this.pushUsage(u))
  }

  // ---------- inbound ----------

  private listen() {
    if (!this.fs) return
    // Once every collection's first snapshot from the server (not the offline
    // cache) has been applied, local data has caught up with the cloud and
    // the store may run its migrations (backlog plan §2.1).
    const caughtUp: Promise<unknown>[] = []
    for (const coll of COLLECTIONS) {
      let pending: Promise<void>[] | null = []
      const unsub = onSnapshot(
        collection(this.fs, coll),
        // Metadata changes too, or a cache snapshot that the server confirms unchanged never says so.
        { includeMetadataChanges: true },
        snap => {
          for (const change of snap.docChanges()) {
            if (change.type === 'removed') continue
            // Our own pending writes come back through here too; skip them.
            if (change.doc.metadata.hasPendingWrites) continue
            const applied = this.applyRemote(coll, change.doc.data() as db.Record_)
            pending?.push(applied)
          }
          if (pending && !snap.metadata.fromCache) {
            caughtUp.push(Promise.allSettled(pending))
            pending = null
            if (caughtUp.length === COLLECTIONS.length) void Promise.all(caughtUp).then(() => store.syncedOnce())
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
    setUsagePusher(null)
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
    if (!this.fs || this.status !== 'ready' || this.flushing || !navigator.onLine) return
    this.flushing = true
    try {
      for (const id of await db.outboxIds()) {
        const blob = await db.getBlob(id)
        if (blob) {
          const data = Bytes.fromUint8Array(new Uint8Array(await blob.arrayBuffer()))
          await setDoc(doc(this.fs, 'blobs', id), { id, type: blob.type || 'image/jpeg', data })
        }
        await db.outboxDone(id)
      }
    } catch (e) {
      this.setStatus(this.status, String(e))
    } finally {
      this.flushing = false
    }
  }

  private async fetchBlob(id: string): Promise<Blob | null> {
    if (!this.fs || this.status !== 'ready') return null
    try {
      const snap = await getDoc(doc(this.fs, 'blobs', id))
      if (!snap.exists()) return null
      const { data, type } = snap.data() as { data: Bytes; type?: string }
      const blob = new Blob([Uint8Array.from(data.toUint8Array())], { type: type || 'image/jpeg' })
      await db.putBlob(id, blob, true)
      return blob
    } catch {
      return null
    }
  }

  // ---------- usage stats ----------

  private async pushUsage(u: UsageDay) {
    if (!this.fs || this.status !== 'ready') throw new Error('sync not ready')
    await setDoc(doc(this.fs, 'usage', u.id), u)
  }

  /** Every device's usage days from `from` on: a one-off read for the stats screen (null if it fails or sync is off). */
  async fetchUsage(from: ISODate): Promise<UsageDay[] | null> {
    if (!this.fs || this.status !== 'ready') return null
    try {
      const snap = await getDocs(query(collection(this.fs, 'usage'), where('date', '>=', from)))
      return snap.docs.map(d => d.data() as UsageDay)
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
