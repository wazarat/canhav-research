import { FormEvent, useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

/**
 * /admin/members — super-admin-only editorial tool for managing the
 * public.admin_users allow-list. Admins can view the list; only
 * super-admins can add or remove editors (the API enforces this, the UI
 * just hides the controls).
 *
 * Adding an editor by email:
 *   * If they already have a Supabase user row, promote instantly.
 *   * Otherwise Supabase sends them an invite email — their first click
 *     on the sign-in link creates their account.
 */

type Role = 'admin' | 'super_admin'

type Member = {
  user_id: string
  email: string
  role: Role
  added_by: string | null
  added_at: string
  notes: string | null
}

export default function AdminMembers() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [selfRole, setSelfRole] = useState<Role | null>(null)
  const [selfId, setSelfId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState<
    { kind: 'ok' | 'err'; message: string } | null
  >(null)
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<Role>('admin')
  const [addNotes, setAddNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/members', { cache: 'no-store' })
      if (res.status === 401) {
        router.replace('/admin/login?next=/admin/members')
        return
      }
      if (!res.ok) throw new Error(`API ${res.status}`)
      const body = await res.json()
      setMembers(body.members ?? [])
      setSelfRole(body.self?.role ?? null)
      setSelfId(body.self?.user?.id ?? null)
    } catch (err) {
      console.error(err)
      setBanner({ kind: 'err', message: 'Failed to load members' })
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    refresh()
  }, [refresh])

  const isSuper = selfRole === 'super_admin'

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!isSuper) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: addEmail.trim(),
          role: addRole,
          notes: addNotes.trim() || null,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBanner({ kind: 'err', message: body?.error ?? 'Failed to add' })
        return
      }
      setBanner({
        kind: 'ok',
        message: `Added ${addEmail} as ${addRole}`,
      })
      setAddEmail('')
      setAddNotes('')
      setAddRole('admin')
      refresh()
    } finally {
      setSubmitting(false)
    }
  }

  async function onRemove(m: Member) {
    if (!isSuper) return
    const confirmMsg =
      m.user_id === selfId
        ? 'Remove YOURSELF as an editor? You will lose admin access immediately.'
        : `Remove ${m.email} from the admin list? Their Supabase account stays intact; they just lose access.`
    if (!window.confirm(confirmMsg)) return
    const res = await fetch('/api/admin/members', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: m.user_id }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setBanner({ kind: 'err', message: body?.error ?? 'Remove failed' })
      return
    }
    setBanner({ kind: 'ok', message: `Removed ${m.email}` })
    refresh()
  }

  async function onSignOut() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Admin — Editors</title>
      </Head>

      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold text-gray-900">
            CanHav Admin
          </Link>
          <nav className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            <Link
              href="/admin/entities"
              className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 rounded-md"
            >
              Merge candidates
            </Link>
            <span className="px-3 py-1 text-xs font-medium bg-white text-blue-600 shadow-sm rounded-md">
              Editors
            </span>
            {isSuper && (
              <Link
                href="/admin/activity"
                className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 rounded-md"
              >
                Activity
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
            <Link
              href="/market-map"
              className="text-gray-500 hover:text-blue-600"
            >
              View site
            </Link>
            <button
              onClick={onSignOut}
              className="text-gray-500 hover:text-red-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {banner && (
          <div
            className={`rounded-lg border px-4 py-2 text-sm flex items-start gap-3 ${
              banner.kind === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <span className="flex-1">{banner.message}</span>
            <button
              onClick={() => setBanner(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              dismiss
            </button>
          </div>
        )}

        {isSuper && (
          <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Invite an editor
            </h2>
            <form
              onSubmit={onAdd}
              className="grid sm:grid-cols-[1fr_140px_auto] gap-3 items-end"
            >
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  required
                  placeholder="alice@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Role
                </label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as Role)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="admin">admin</option>
                  <option value="super_admin">super_admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting || !addEmail}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {submitting ? 'Adding…' : 'Add editor'}
              </button>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Notes (optional)
                </label>
                <input
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="Team, purpose, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </form>
            <p className="mt-3 text-[11px] text-gray-500">
              If the user already has a Supabase account they&apos;ll get
              access instantly. Otherwise Supabase will email them an invite
              link to finish sign-in.
            </p>
          </section>
        )}

        <section className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center">
            <h2 className="text-sm font-semibold text-gray-900">
              Current editors
            </h2>
            <span className="ml-2 text-xs text-gray-400">
              {loading ? 'Loading…' : `${members.length}`}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-2 text-left">Email</th>
                <th className="px-5 py-2 text-left">Role</th>
                <th className="px-5 py-2 text-left">Added</th>
                <th className="px-5 py-2 text-left">Notes</th>
                {isSuper && <th className="px-5 py-2 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => (
                <tr key={m.user_id}>
                  <td className="px-5 py-2 text-sm text-gray-900 font-medium">
                    {m.email}
                    {m.user_id === selfId && (
                      <span className="ml-2 text-[10px] text-gray-400 uppercase">
                        you
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        m.role === 'super_admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td className="px-5 py-2 text-xs text-gray-500">
                    {new Date(m.added_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-2 text-xs text-gray-500 truncate max-w-xs">
                    {m.notes ?? ''}
                  </td>
                  {isSuper && (
                    <td className="px-5 py-2 text-right">
                      <button
                        onClick={() => onRemove(m)}
                        className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && members.length === 0 && (
                <tr>
                  <td
                    colSpan={isSuper ? 5 : 4}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    No editors yet. Use the seed SQL in the docs to add the
                    first super-admin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {!isSuper && selfRole === 'admin' && (
          <p className="text-[11px] text-gray-500">
            Read-only view. Only super-admins can add or remove editors.
          </p>
        )}
      </main>
    </div>
  )
}
