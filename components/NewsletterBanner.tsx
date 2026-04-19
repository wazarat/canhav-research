import { useState } from 'react'

/**
 * <NewsletterBanner /> — CAN-NEW-05.
 *
 * Lightweight, provider-agnostic email capture. Currently writes to
 * public.newsletter_signups via /api/newsletter; swapping in a real
 * ESP (Substack / ConvertKit / Beehiiv) is a one-line change on the
 * server. The component intentionally has no modal / popup behaviour —
 * researchers hate interruptions.
 *
 * Mount once in `components/Layout.tsx` just above the footer so it
 * appears site-wide.
 */

interface Props {
  source?: string
  variant?: 'footer' | 'inline'
}

export default function NewsletterBanner({ source = 'footer', variant = 'footer' }: Props) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (state === 'loading') return
    setState('loading')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error || `status ${res.status}`)
      }
      setState('success')
      setEmail('')
    } catch (err: any) {
      setErrorMsg(err?.message || 'Something went wrong — please try again.')
      setState('error')
    }
  }

  const isFooter = variant === 'footer'

  return (
    <section
      className={
        isFooter
          ? 'border-t border-gray-800/60 bg-gray-950/70'
          : 'rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white'
      }
      aria-label="Subscribe to the CanHav newsletter"
    >
      <div
        className={
          isFooter
            ? 'container mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4'
            : 'p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4'
        }
      >
        <div className="max-w-xl">
          <h3
            className={
              isFooter
                ? 'text-base md:text-lg font-semibold text-white'
                : 'text-base md:text-lg font-semibold text-gray-900'
            }
          >
            New research, straight to your inbox.
          </h3>
          <p
            className={
              isFooter
                ? 'mt-1 text-sm text-gray-300'
                : 'mt-1 text-sm text-gray-600'
            }
          >
            No spam. Just long-form deep dives on Ethereum infrastructure, paired
            with the underlying Market Map data.
          </p>
        </div>

        {state === 'success' ? (
          <div
            className={
              isFooter
                ? 'text-sm text-emerald-300'
                : 'text-sm text-emerald-700'
            }
          >
            You&apos;re on the list. See you in your inbox.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-2 w-full md:w-auto"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              disabled={state === 'loading'}
              className={
                isFooter
                  ? 'px-3 py-2 min-w-[240px] rounded-md bg-gray-900 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60'
                  : 'px-3 py-2 min-w-[240px] rounded-md bg-white border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60'
              }
            />
            <button
              type="submit"
              disabled={state === 'loading'}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {state === 'loading' ? 'Subscribing…' : 'Subscribe'}
            </button>
          </form>
        )}
      </div>

      {state === 'error' && errorMsg && (
        <div
          className={
            isFooter
              ? 'container mx-auto px-6 pb-4 text-xs text-red-300'
              : 'px-6 pb-4 text-xs text-red-600'
          }
        >
          {errorMsg}
        </div>
      )}
    </section>
  )
}
