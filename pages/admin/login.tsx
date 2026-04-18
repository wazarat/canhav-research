import { useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

/**
 * /admin/login — shared-secret editor sign-in for the /admin/* area.
 *
 * Two inputs: token (the ADMIN_AUTH_TOKEN env value) and editor display
 * name (stored in a non-HttpOnly cookie so audit rows can be stamped with
 * who applied a given merge).
 */
export default function AdminLogin() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [editorName, setEditorName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const nextPath =
    typeof router.query.next === 'string' && router.query.next.startsWith('/')
      ? router.query.next
      : '/admin/entities'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, editor_name: editorName }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Login failed')
      }
      router.push(nextPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Head>
        <title>Admin Sign-In — CanHav Research</title>
      </Head>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-5"
      >
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Editor sign-in</h1>
          <p className="mt-1 text-sm text-gray-500">
            Shared-secret access to the entity editorial tools.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Editor name
          </label>
          <input
            value={editorName}
            onChange={(e) => setEditorName(e.target.value)}
            placeholder="e.g. Warda"
            autoComplete="username"
            required
            maxLength={64}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Stamped on every merge in the audit trail.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Admin token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Value of the ADMIN_AUTH_TOKEN env var.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !token || !editorName}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
