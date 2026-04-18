'use client'

import { useMemo, useState } from 'react'

/**
 * Landscape view — stablecoinsmap.com-style dense panel layout.
 *
 * Instead of a rigid 3-col grid, we lay sector panels out with CSS
 * `columns-*` (masonry). Tall sectors don't force short neighbours to
 * leave whitespace; the result tiles tightly without column gaps. The
 * "Compact" sub-toggle shrinks chip padding/gap so everything fits
 * on one screen for an ~500-company dataset.
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

type Density = 'compact' | 'standard'

export default function MarketMapLandscape({
  companies,
  sectorOrder,
  sectorTokens,
  onSelect,
  selectedSector,
}: Props) {
  const [density, setDensity] = useState<Density>('standard')

  // Bucket: sector -> subsector -> companies[].
  const bucketed = useMemo(() => {
    const result: Record<string, Record<string, LandscapeCompany[]>> = {}
    for (const c of companies) {
      const sectors = c.sectors && c.sectors.length ? c.sectors : [c.sector]
      const subsectors =
        c.subsectors && c.subsectors.length ? c.subsectors : [c.subsector]
      for (const sector of sectors) {
        if (!sector) continue
        if (selectedSector && sector !== selectedSector) continue
        if (!result[sector]) result[sector] = {}
        for (const sub of subsectors) {
          if (!sub) continue
          if (!result[sector][sub]) result[sector][sub] = []
          if (
            !result[sector][sub].some(
              (x) => x.entity_id === c.entity_id && x.name === c.name
            )
          ) {
            result[sector][sub].push(c)
          }
        }
      }
    }
    return result
  }, [companies, selectedSector])

  const visibleSectors = sectorOrder.filter((s) => bucketed[s])

  if (visibleSectors.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-gray-500">
        No companies match the current filter.
      </div>
    )
  }

  // Density classes — all tailwind arbitrary values so there's no runtime
  // stylesheet plumbing. Compact targets a ~stablecoinsmap.com feel.
  const chipCls =
    density === 'compact'
      ? 'text-[11px] px-1.5 py-[1px] leading-tight'
      : 'text-xs px-2 py-0.5'
  const chipGap = density === 'compact' ? 'gap-[3px]' : 'gap-1.5'
  const subHeaderCls =
    density === 'compact'
      ? 'text-[10px] font-semibold text-gray-500 mb-1'
      : 'text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5'
  const panelPadding = density === 'compact' ? 'p-3 space-y-2.5' : 'p-4 space-y-4'
  const columnsCls =
    density === 'compact'
      ? 'columns-1 sm:columns-2 md:columns-3 xl:columns-4 2xl:columns-5 gap-3 [column-fill:_balance]'
      : 'columns-1 md:columns-2 xl:columns-3 gap-4 [column-fill:_balance]'
  const panelGapCls = density === 'compact' ? 'mb-3' : 'mb-4'

  return (
    <div>
      {/* Density toggle */}
      <div className="flex items-center justify-end mb-3">
        <div className="inline-flex p-0.5 bg-gray-100 rounded-lg text-[11px] font-medium">
          {(['compact', 'standard'] as Density[]).map((d) => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                density === d
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className={columnsCls}>
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
              className={`rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden break-inside-avoid ${panelGapCls}`}
            >
              <header
                className={`px-3 py-2 flex items-center gap-2 ${tokens.soft}`}
                style={{ borderBottom: `1px solid ${tokens.accent}33` }}
              >
                <span
                  className="w-1 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: tokens.accent }}
                />
                <h2 className="text-xs font-semibold text-gray-900 flex-1 min-w-0 truncate">
                  {sector}
                </h2>
                <span className="text-[10px] text-gray-500 font-medium">{total}</span>
              </header>

              <div className={panelPadding}>
                {entries.map(([subsector, list]) => (
                  <div key={subsector}>
                    <h3 className={subHeaderCls}>{subsector}</h3>
                    <div className={`flex flex-wrap ${chipGap}`}>
                      {list.map((c) => (
                        <LandscapeChip
                          key={`${subsector}-${c.entity_id ?? c.name}`}
                          company={c}
                          accent={tokens.accent}
                          chipCls={chipCls}
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
    </div>
  )
}

function LandscapeChip({
  company,
  accent,
  chipCls,
  onSelect,
}: {
  company: LandscapeCompany
  accent: string
  chipCls: string
  onSelect: (entityId: number) => void
}) {
  const title = company.description
    ? `${company.name} — ${company.description}`
    : company.name

  const clickable = typeof company.entity_id === 'number'

  const inner = (
    <>
      <span
        className="w-1 h-1 rounded-full shrink-0"
        style={{ backgroundColor: accent }}
      />
      <span className="truncate max-w-[150px]">{company.name}</span>
    </>
  )

  const base = `group inline-flex items-center gap-1 rounded-md border border-gray-200 ${chipCls}`

  return clickable ? (
    <button
      onClick={() => onSelect(company.entity_id!)}
      title={title}
      className={`${base} bg-gray-50 hover:bg-white hover:border-gray-300 text-gray-700 hover:text-gray-900 transition`}
    >
      {inner}
    </button>
  ) : (
    <span
      title={title}
      className={`${base} bg-gray-50 text-gray-500`}
    >
      {inner}
    </span>
  )
}
