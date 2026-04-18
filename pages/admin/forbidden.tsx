import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getSupabaseAuthBrowser } from '../../lib/supabaseBrowser'

/**
 * /admin/forbidden — landing page for signed-in users who aren't in
 * public.admin_users. They can sign out from here (to sign in as a
 * different account) or head back to the public site.
 */
export default function Forbidden() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const sb = getSupabaseAuthBrowser()
    if (!sb) return
    sb.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  async function onSignOut() {
    setSigningOut(true)
    const sb = getSupabaseAuthBrowser()
    if (sb) await sb.auth.signOut()
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Head>
        <title>Access denied — CanHav Research</title>
      </Head>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-7 space-y-4">
        <h1 className="text-lg font-semibold text-gray-900">Access denied</h1>
        <p className="text-sm text-gray-600">
          {email ? (
            <>
              You&apos;re signed in as{' '}
              <span className="font-medium text-gray-800">{email}</span>, but
              that account isn&apos;t on the editor list. Ask a super-admin to
              add it, or sign in with a different account.
            </>
          ) : (
            <>
              You&apos;re signed in, but your account isn&apos;t on the editor
              list.
            </>
          )}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onSignOut}
            disabled={signingOut}
            className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-60"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
          <Link
            href="/market-map"
            className="flex-1 text-center px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
          >
            Back to site
          </Link>
        </div>
      </div>
    </div>
  )
}
