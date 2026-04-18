import { FormEvent, useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getSupabaseAuthBrowser } from '../lib/supabaseBrowser'

/**
 * /login — viewer (public) sign-in page.
 *
 * Mirrors /admin/login but is scoped to regular site users: anyone with a
 * valid session counts, no admin_users allow-list lookup. Admins can also
 * sign in here — they'll just have the extra privileges when they visit
 * /admin/* pages.
 *
 * Flow:
 *   1. User hits a gated page (e.g. /company/42).
 *   2. middleware.ts redirects to /login?next=/company/42.
 *   3. They sign in with Google OAuth or receive an email magic link.
 *   4. /api/auth/callback exchanges the code for a session cookie and
 *      redirects back to ?next=... .
 *
 * shouldCreateUser is TRUE here (unlike /admin/login) — any visitor can
 * create an account via magic link.
 */

export default function ViewerLogin() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState<'google' | 'email' | null>(null)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextPath =
    typeof router.query.next === 'string' && router.query.next.startsWith('/')
      ? router.query.next
      : '/market-map'

  useEffect(() => {
    if (typeof router.query.error === 'string') setError(router.query.error)
  }, [router.query.error])

  function buildCallbackUrl() {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const next = encodeURIComponent(nextPath)
    return `${origin}/api/auth/callback?next=${next}`
  }

  async function onGoogle() {
    setError(null)
    setSubmitting('google')
    const supabase = getSupabaseAuthBrowser()
    if (!supabase) {
      setError('Auth not configured (missing NEXT_PUBLIC_ETHDATA_SUPABASE_*).')
      setSubmitting(null)
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: buildCallbackUrl() },
    })
    if (error) {
      setError(error.message)
      setSubmitting(null)
    }
  }

  async function onEmailLink(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting('email')
    try {
      const supabase = getSupabaseAuthBrowser()
      if (!supabase) throw new Error('Auth not configured')
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: buildCallbackUrl(),
          shouldCreateUser: true,
        },
      })
      if (error) throw error
      setEmailSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center px-4">
      <Head>
        <title>Sign in — CanHav Market Map</title>
      </Head>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
        <div>
          <Link
            href="/"
            className="text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            ← CanHav
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-gray-900">
            Sign in to view full profiles
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Browsing the market map is free. Create a free account to unlock
            full company profiles, save favourites, and get research
            updates.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoogle}
          disabled={submitting !== null}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
        >
          <GoogleIcon />
          {submitting === 'google' ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="relative flex items-center">
          <div className="flex-grow border-t border-gray-200" />
          <span className="mx-3 text-[11px] uppercase tracking-wider text-gray-400">
            or
          </span>
          <div className="flex-grow border-t border-gray-200" />
        </div>

        <form onSubmit={onEmailLink} className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">
            Continue with email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={emailSent}
            autoComplete="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={submitting !== null || emailSent || !email}
            className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:bg-gray-300"
          >
            {emailSent
              ? 'Check your inbox'
              : submitting === 'email'
              ? 'Sending…'
              : 'Send sign-in link'}
          </button>
          {emailSent ? (
            <p className="text-[11px] text-gray-500 pt-1">
              A one-click sign-in link was sent to{' '}
              <span className="font-medium text-gray-700">{email}</span>. You
              can close this tab and open the link from your inbox.
            </p>
          ) : (
            <p className="text-[11px] text-gray-500 pt-1">
              Works with Gmail, Outlook, Hotmail, work email — any inbox.
            </p>
          )}
        </form>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <p className="text-[11px] text-gray-400 pt-1 text-center">
          By signing in you agree to receive occasional product updates.
          We will never sell your email.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.6 6.1 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-8 19.6-20 0-1.3-.2-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.8 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C33.6 6.1 29 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.7-2 13.2-5.2l-6.1-5c-2 1.4-4.5 2.2-7.1 2.2-5.3 0-9.7-3.6-11.3-8.4l-6.5 5C9.6 39.5 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4.1 5.3l6.1 5c4.3-4 7.3-10 7.3-16.3 0-1.3-.2-2.3-.4-3.5z"
      />
    </svg>
  )
}
