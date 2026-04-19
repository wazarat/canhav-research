import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

/**
 * /submit-company (CAN-NEW-10)
 *
 * Lightweight in-app replacement for the old JotForm flow. Writes to
 * public.submissions via /api/submissions.
 *
 * Kept intentionally small — 4 fields and 1 submit button. Power-users
 * can drop a longer note in the textarea; reviewers promote accepted
 * submissions to real entities through /admin/entities.
 */

interface SubsectorOption {
  subsector_id: number
  subsector_name: string
  sector_name: string
}

export default function SubmitCompanyPage() {
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [subsectorId, setSubsectorId] = useState<string>('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [subsectors, setSubsectors] = useState<SubsectorOption[]>([])
  const [loadingSubsectors, setLoadingSubsectors] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/subsectors')
        if (!res.ok) throw new Error(`status ${res.status}`)
        const body = await res.json()
        if (!cancelled) setSubsectors(body.subsectors ?? [])
      } catch (err) {
        console.error('[submit-company] subsector load', err)
      } finally {
        if (!cancelled) setLoadingSubsectors(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Group subsectors by parent sector so the dropdown is scannable —
  // the raw list otherwise runs to ~40 rows in alphabetical order and
  // most users won't know where to look.
  const grouped = useMemo(() => {
    const by: Record<string, SubsectorOption[]> = {}
    for (const s of subsectors) {
      const key = s.sector_name || 'Other'
      if (!by[key]) by[key] = []
      by[key].push(s)
    }
    return Object.entries(by)
      .map(([sector, list]) => ({
        sector,
        list: list.sort((a, b) => a.subsector_name.localeCompare(b.subsector_name)),
      }))
      .sort((a, b) => a.sector.localeCompare(b.sector))
  }, [subsectors])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          website: website.trim(),
          subsector_id: subsectorId ? Number(subsectorId) : null,
          submitter_email: email.trim() || undefined,
          notes: notes.trim() || undefined,
          source: 'submit-company',
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error || `status ${res.status}`)
      }
      setSuccess(true)
      setName('')
      setWebsite('')
      setSubsectorId('')
      setEmail('')
      setNotes('')
    } catch (err: any) {
      setError(err?.message || 'Something went wrong — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Submit a company — CanHav Research</title>
        <meta
          name="description"
          content="Tell us about a company we're missing from the CanHav Market Map."
        />
      </Head>

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-600 hover:text-blue-700">
            CanHav Research
          </Link>
          <Link
            href="/market-map"
            className="text-sm text-gray-500 hover:text-blue-600"
          >
            ← Back to Market Map
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
          Missing a company?
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Share the basics and we&apos;ll review it for the next research pass.
          Submissions go straight to the admin queue — no JotForm detour.
        </p>

        {success ? (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-emerald-800">
            <h2 className="text-base font-semibold">Thanks — submission received.</h2>
            <p className="text-sm mt-1">
              We&apos;ll review it shortly. Feel free to&nbsp;
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="underline hover:text-emerald-900"
              >
                submit another
              </button>
              &nbsp;or&nbsp;
              <Link href="/market-map" className="underline hover:text-emerald-900">
                head back to the map
              </Link>
              .
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-5"
          >
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Company name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
                autoFocus
                placeholder="e.g. Ethena"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                required
                placeholder="https://example.xyz"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Best-fit subsector <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <select
                value={subsectorId}
                onChange={(e) => setSubsectorId(e.target.value)}
                disabled={loadingSubsectors}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">
                  {loadingSubsectors ? 'Loading…' : 'Not sure — let the research team decide'}
                </option>
                {grouped.map(({ sector, list }) => (
                  <optgroup key={sector} label={sector}>
                    {list.map((s) => (
                      <option key={s.subsector_id} value={s.subsector_id}>
                        {s.subsector_name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Your email <span className="text-gray-400 font-normal normal-case">(optional — we&apos;ll ping you when it lands)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Why it matters <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Key product, market cap / TVL, who's building it, any links to coverage…"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
              <p className="mt-1 text-[11px] text-gray-400">{notes.length}/2000 characters</p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Link
                href="/market-map"
                className="text-xs text-gray-500 hover:text-gray-800"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Submit'}
                {!submitting && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
