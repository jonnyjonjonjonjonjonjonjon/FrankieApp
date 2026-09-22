import { useState } from 'react'
import { LogOut, Plus, Trash2 } from 'lucide-react'
import { useSync } from '../../lib/useSync'
import { BigButton } from '../ui/BigButton'

/** Who can open the diary: Google accounts on the members list (cloud sync only). */
export function FamilyAccounts() {
  const sync = useSync()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  if (!sync.enabled) {
    return <p className="text-lg text-ink-soft">Cloud sync is not set up on this build, so the diary lives on this device only.</p>
  }
  const me = sync.user?.email?.toLowerCase()
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xl font-bold">
        Signed in as <span className="text-ink-soft">{sync.user?.email}</span>
        {' · '}
        {sync.online ? 'online' : 'offline, will sync later'}
      </p>
      {sync.members.map(m => (
        <div key={m.email} className="flex items-center gap-3 rounded-2xl border-4 border-line p-2">
          <span className="min-w-0 flex-1 truncate text-xl font-bold">
            {m.name} <span className="text-ink-soft">{m.email}</span>
          </span>
          {m.email !== me && (
            <BigButton size="sm" variant="danger" onClick={() => void sync.removeMember(m.email)} aria-label={`Remove ${m.email}`}>
              <Trash2 size={28} strokeWidth={2.5} />
            </BigButton>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Name"
          className="min-h-14 w-40 rounded-2xl border-4 border-line px-3 text-xl font-bold"
        />
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Google email"
          type="email"
          autoCapitalize="none"
          className="min-h-14 min-w-64 flex-1 rounded-2xl border-4 border-line px-3 text-xl font-bold"
        />
        <BigButton
          variant="primary"
          size="sm"
          disabled={!email.includes('@')}
          onClick={() => {
            void sync.addMember(email, name)
            setEmail('')
            setName('')
          }}
        >
          <Plus size={28} strokeWidth={3} /> Add
        </BigButton>
      </div>
      <BigButton size="sm" className="self-start" onClick={() => void sync.signOut()}>
        <LogOut size={28} strokeWidth={2.5} /> Sign out on this device
      </BigButton>
      {sync.lastError && <p className="text-base text-ink-soft">{sync.lastError}</p>}
    </div>
  )
}
