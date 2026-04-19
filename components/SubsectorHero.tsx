import { useEffect, useState } from 'react'

/**
 * <SubsectorHero /> — CAN-NEW-04.
 *
 * Shown above the market-map grid when exactly one subsector filter is
 * active. Pulls its copy from /content/subsectors/index.json via
 * /api/subsector-summary/[slug]. If no summary is configured for the
 * subsector we render nothing — the grid collapses back to its default
 * state.
 *
 * Why client-fetched instead of baked in: the registry will grow, and
 * the market-map already fetches a lot on mount. Loading the summary
 * on-demand (after the filter changes) keeps the initial payload tight.
 */

interface SubsectorSummary {
  slug: string
  name: string
  what: string
  why: string
  trust_model: string | null
}

interface Props {
  subsectorName: string
  sectorName?: string | null
  entityCount?: number | null
}

export default function SubsectorHero({ subsectorName, sectorName, entityCount }: Props) {
  const [summary, setSummary] = useState<SubsectorSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setSummary(null)
    setLoading(true)
    const controller = new AbortController()
    async function load() {
      try {
        const res = await fetch(
          `/api/subsector-summary/${encodeURIComponent(subsectorName)}`,
          { signal: controller.signal }
        )
        if (res.ok) {
          const body = await res.json()
          if (!cancelled) setSummary(body.summary ?? null)
        } else if (!cancelled) {
          setSummary(null)
        }
      } catch {
        if (!cancelled) setSummary(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [subsectorName])

  if (loading || !summary) return null

  return (
    <section
      className="mb-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 md:p-6"
      aria-label={`About ${summary.name}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
        {sectorName && <span className="text-gray-500">{sectorName}</span>}
        {sectorName && <span className="text-gray-300">›</span>}
        <span>{summary.name}</span>
        {typeof entityCount === 'number' && entityCount > 0 && (
          <span className="ml-auto text-[11px] text-gray-500 font-medium tracking-normal normal-case">
            {entityCount} entit{entityCount === 1 ? 'y' : 'ies'}
          </span>
        )}
      </div>

      <h3 className="mt-1.5 text-lg md:text-xl font-semibold text-gray-900">
        {summary.name}
      </h3>

      <p className="mt-2 text-sm md:text-[15px] text-gray-700 leading-relaxed">
        {summary.what}
      </p>

      {(summary.why || summary.trust_model) && (
        <dl className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {summary.why && (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Why it matters
              </dt>
              <dd className="mt-1 text-sm text-gray-700 leading-relaxed">
                {summary.why}
              </dd>
            </div>
          )}
          {summary.trust_model && (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Trust model
              </dt>
              <dd className="mt-1 text-sm text-gray-700 leading-relaxed">
                {summary.trust_model}
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  )
}
