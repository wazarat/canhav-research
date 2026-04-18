'use client'

import { useMemo } from 'react'

/**
 * Landscape view: a16z-style sector panels laid out in a responsive 1/2/3
 * column grid. Each panel has a sector-colored header bar and groups its
 * companies under subsector sub-headers as small chip tiles. Intended for
 * scan-a-map-at-a-glance use cases.
 *
 * Pure presentational — fed the already-filtered company list from
 * MarketMap and asks the parent to open the drawer on click.
 */

export interface LandscapeCompany {
  entity_id?: number
  name: string
  sector: string
  subsector: string
  sectors?: string[]
  subsectors?: string[]
  description?: string
  logo_url?: string | null
}

interface Props {
  companies: LandscapeCompany[]
  sectorOrder: string[]
  sectorTokens: (sector: string) => {
    accent: string
    bg: string
    text: string
    soft: string
  }
  onSelect: (entityId: number) => void
  selectedSector: string | null
}

export default function MarketMapLandscape({
  companies,
  sectorOrder,
  sectorTokens,
  onSelect,
  selectedSector,
}: Props) {
  // Bucket: sector -> subsector -> companies[].
  const bucketed = useMemo(() => {
    const result: Record<string, Record<string, LandscapeCompany[]>> = {}
    for (const c of companies) {
      const sectors = c.sectors && c.sectors.length ? c.sectors : [c.sector]
      const subsectors = c.subsectors && c.subsectors.length ? c.subsectors : [c.subsector]
      for (const sector of sectors) {
        if (!sector) continue
        if (selectedSector && sector !== selectedSector) continue
        if (!result[sector]) result[sector] = {}
        // A company can be classified in several subsectors of the same
        // sector; we surface all of them inside that sector's panel.
        for (const sub of subsectors) {
          if (!sub) continue
          const key = sub
          if (!result[sector][key]) result[sector][key] = []
          if (!result[sector][key].some((x) => x.entity_id === c.entity_id && x.name === c.name)) {
            result[sector][key].push(c)
          }
        }
      }
    }
    return result
  }, [companies, selectedSector])

  const visibleSectors = sectorOrder.filter((s) => bucketed[s])

  if (visibleSectors.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {visibleSectors.map((sector) => {
        const subsectors = bucketed[sector]
        const entries = Object.entries(subsectors).sort((a, b) =>
          a[0].localeCompare(b[0])
        )
        const tokens = sectorTokens(sector)
        const total = entries.reduce((acc, [, arr]) => acc + arr.length, 0)

        return (
          <section
            key={sector}
            className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col"
          >
            <header
              className={`px-4 py-3 flex items-center gap-2 ${tokens.soft}`}
              style={{ borderBottom: `1px solid ${tokens.accent}33` }}
            >
              <span
                className="w-1.5 h-4 rounded-full shrink-0"
                style={{ backgroundColor: tokens.accent }}
              />
              <h2 className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">
                {sector}
              </h2>
              <span className="text-[11px] text-gray-500">{total}</span>
            </header>

            <div className="p-4 space-y-4 flex-1">
              {entries.map(([subsector, list]) => (
                <div key={subsector}>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    {subsector}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((c) => (
                      <LandscapeChip
                        key={`${subsector}-${c.entity_id ?? c.name}`}
                        company={c}
                        accent={tokens.accent}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function LandscapeChip({
  company,
  accent,
  onSelect,
}: {
  company: LandscapeCompany
  accent: string
  onSelect: (entityId: number) => void
}) {
  const label = company.name
  const title = company.description
    ? `${company.name} — ${company.description}`
    : company.name

  const clickable = typeof company.entity_id === 'number'

  const inner = (
    <span className="flex items-center gap-1.5">
      <span
        className="w-1 h-1 rounded-full"
        style={{ backgroundColor: accent }}
      />
      <span className="truncate max-w-[160px]">{label}</span>
    </span>
  )

  return clickable ? (
    <button
      onClick={() => onSelect(company.entity_id!)}
      title={title}
      className="group inline-flex items-center px-2 py-1 rounded-md bg-gray-50 hover:bg-white border border-gray-200 hover:border-gray-300 text-xs text-gray-700 hover:text-gray-900 transition"
    >
      {inner}
    </button>
  ) : (
    <span
      title={title}
      className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs text-gray-500"
    >
      {inner}
    </span>
  )
}
