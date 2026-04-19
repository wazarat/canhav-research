import Head from 'next/head'
import Link from 'next/link'
import type { GetStaticPaths, GetStaticProps } from 'next'
import Layout from '../../components/Layout'
import { getSupabaseAdmin } from '../../lib/supabaseNew'
import { getArticlesForSector, type Article } from '../../lib/articles'
import { getSubsectorSummary } from '../../lib/subsectorSummary'
import { toSlug } from '../../lib/slug'

/**
 * /sectors/[slug] — CAN-NEW-11.
 *
 * Long-form SEO surface per sector. Generated at build time from
 * Supabase (subsector list + per-subsector root-entity counts) and the
 * /content/articles registry (latest writing tagged to this sector).
 *
 * Includes JSON-LD schema markup (`CollectionPage` + `BreadcrumbList`)
 * so search engines can render rich results for "Ethereum stablecoin
 * infrastructure" style queries.
 *
 * Revalidation: 1 hour. Low-traffic-yet-important — and changes only
 * when the subsector list grows.
 */

interface SubsectorEntry {
  subsector_name: string
  subsector_slug: string
  root_count: number
  // Optional blurb sourced from /content/subsectors/index.json.
  summary_what: string | null
}

interface SectorPageProps {
  sector_name: string
  sector_slug: string
  description: string | null
  total_root_entities: number
  subsectors: SubsectorEntry[]
  articles: Article[]
  all_sectors: Array<{ sector_name: string; sector_slug: string; entity_count: number }>
}

// One-sentence positioning blurbs. Kept in-module (not in /content) because
// these are the top-of-funnel SEO hooks and I want them versioned with
// the page code, not as separately-editable content.
const SECTOR_BLURBS: Record<string, string> = {
  'Core Protocol Architecture':
    'The base layer of Ethereum — execution clients, consensus clients, staking providers, MEV infrastructure, and the researchers driving network upgrades.',
  'Rollup & Scaling Frameworks':
    'Layer 2 and appchain frameworks compressing Ethereum throughput — optimistic rollups, ZK rollups, validiums, and app-specific chain stacks.',
  'Monetary & Access Rails':
    'The dollar layer of on-chain finance — stablecoin issuers, on-ramps, institutional payment networks, and regional fiat bridges.',
  'DeFi Systems Architecture':
    'The core primitives of DeFi — lending, DEXs, yield, liquid staking, restaking, and synthetic derivatives.',
  'Data & Consensus Infrastructure':
    'The infrastructure layer feeding every on-chain app — RPC providers, oracles, data availability, indexing engines, and analytics.',
  'Advanced Compute & Integration':
    'Where Ethereum meets the physical and AI worlds — autonomous agents, real-world assets, DePIN, identity, and cross-chain compute.',
  'Governance & Enterprise Framework':
    'The institutional surface of Ethereum — DAO governance, enterprise adoption, CBDC pilots, compliance, and custodial security.',
}

export default function SectorPage(props: SectorPageProps) {
  const {
    sector_name,
    sector_slug,
    description,
    total_root_entities,
    subsectors,
    articles,
    all_sectors,
  } = props

  const canonicalUrl = `https://www.canhav.com/sectors/${sector_slug}`

  // CollectionPage JSON-LD + breadcrumbs. One script tag with an array so
  // we don't pay for two <script> tags and keep structure tidy.
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${sector_name} — CanHav Market Map`,
      description:
        description ||
        `Ethereum companies operating in ${sector_name}. Curated by CanHav Research.`,
      url: canonicalUrl,
      isPartOf: {
        '@type': 'WebSite',
        name: 'CanHav Research',
        url: 'https://www.canhav.com',
      },
      about: subsectors.map((s) => ({
        '@type': 'Thing',
        name: s.subsector_name,
      })),
      hasPart: subsectors.map((s) => ({
        '@type': 'Collection',
        name: s.subsector_name,
        url: `https://www.canhav.com/market-map?sector=${sector_slug}&subsector=${s.subsector_slug}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'CanHav Research',
          item: 'https://www.canhav.com',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Market Map',
          item: 'https://www.canhav.com/market-map',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: sector_name,
          item: canonicalUrl,
        },
      ],
    },
  ]

  return (
    <Layout>
      <Head>
        <title>{`${sector_name} — CanHav Market Map`}</title>
        <meta
          name="description"
          content={
            description ??
            `Explore ${total_root_entities} companies across ${subsectors.length} subsectors of ${sector_name}, curated by CanHav Research.`
          }
        />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={`${sector_name} — CanHav Market Map`} />
        <meta
          property="og:description"
          content={
            description ??
            `${total_root_entities} companies across ${subsectors.length} subsectors.`
          }
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <div className="container mx-auto px-6 py-12">
        <nav className="text-sm text-gray-400 mb-6">
          <Link href="/market-map" className="hover:text-blue-300">
            ← Market Map
          </Link>
        </nav>

        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
            Sector
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold text-white">
            {sector_name}
          </h1>
          {description && (
            <p className="mt-3 text-gray-300 text-base md:text-lg leading-relaxed">
              {description}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-gray-400">
            <span>
              <span className="text-white font-semibold">{total_root_entities}</span>{' '}
              companies
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span>
              <span className="text-white font-semibold">{subsectors.length}</span>{' '}
              subsectors
            </span>
            <Link
              href={`/market-map?sector=${sector_slug}`}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
            >
              Open in Market Map
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </header>

        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400 mb-4">
            Subsectors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subsectors.map((s) => (
              <Link
                key={s.subsector_slug}
                href={`/market-map?sector=${sector_slug}&subsector=${s.subsector_slug}`}
                className="group block rounded-xl border border-gray-800 bg-gray-900/50 hover:border-blue-700/60 hover:bg-gray-900/70 transition-colors p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors">
                    {s.subsector_name}
                  </h3>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">
                    {s.root_count} {s.root_count === 1 ? 'entity' : 'entities'}
                  </span>
                </div>
                {s.summary_what && (
                  <p className="mt-2 text-sm text-gray-300 leading-relaxed">
                    {s.summary_what}
                  </p>
                )}
                <div className="mt-3 text-xs font-medium text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore →
                </div>
              </Link>
            ))}
          </div>
        </section>

        {articles.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400 mb-4">
              Recent writing
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((a) => {
                const isExternal = !!a.external_url && a.body.length === 0
                const href = isExternal ? a.external_url! : `/research/${a.slug}`
                return (
                  <li key={a.slug}>
                    <a
                      href={href}
                      {...(isExternal
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                      className="block rounded-xl border border-gray-800 bg-gray-900/50 hover:border-blue-700/60 p-5 transition-colors"
                    >
                      <div className="text-xs text-gray-400">
                        {a.published_at &&
                          new Date(a.published_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                      </div>
                      <div className="mt-1 text-base font-semibold text-white">
                        {a.title}
                        {isExternal && <span className="ml-1 text-gray-400">↗</span>}
                      </div>
                      {a.summary && (
                        <p className="mt-2 text-sm text-gray-300 leading-relaxed">
                          {a.summary}
                        </p>
                      )}
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <section className="mt-16 pt-8 border-t border-gray-800">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400 mb-4">
            Other sectors
          </h2>
          <div className="flex flex-wrap gap-2">
            {all_sectors
              .filter((s) => s.sector_slug !== sector_slug)
              .map((s) => (
                <Link
                  key={s.sector_slug}
                  href={`/sectors/${s.sector_slug}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-800 bg-gray-900/50 text-sm text-gray-300 hover:text-white hover:border-blue-700/60 transition-colors"
                >
                  {s.sector_name}
                  <span className="text-[11px] text-gray-500">{s.entity_count}</span>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </Layout>
  )
}

// ---------------------------------------------------------------------
// Static generation
// ---------------------------------------------------------------------

async function fetchSectors(): Promise<
  Array<{ sector_id: number; sector_name: string }>
> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('sectors')
    .select('sector_id, sector_name')
    .order('sector_name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const sectors = await fetchSectors()
    return {
      paths: sectors.map((s) => ({ params: { slug: toSlug(s.sector_name) } })),
      fallback: 'blocking',
    }
  } catch (err) {
    console.error('[sectors.getStaticPaths]', err)
    return { paths: [], fallback: 'blocking' }
  }
}

export const getStaticProps: GetStaticProps<SectorPageProps, { slug: string }> = async (
  ctx
) => {
  const slug = ctx.params?.slug
  if (!slug) return { notFound: true }

  const sectors = await fetchSectors()
  const sector = sectors.find((s) => toSlug(s.sector_name) === slug)
  if (!sector) return { notFound: true }

  const admin = getSupabaseAdmin()

  // Subsector list for this sector
  const { data: subsData, error: subsErr } = await admin
    .from('subsectors')
    .select('subsector_id, subsector_name, sector_id')
    .eq('sector_id', sector.sector_id)
    .order('subsector_name', { ascending: true })
  if (subsErr) {
    console.error('[sectors.getStaticProps.subsectors]', subsErr)
  }

  // Per-root entity counts across this sector (dedup parent/child).
  const { data: gridData, error: gridErr } = await admin
    .from('v_market_map_grid')
    .select('entity_id, sector_ids, subsectors, sectors')
  if (gridErr) {
    console.error('[sectors.getStaticProps.grid]', gridErr)
  }

  type GridRow = {
    entity_id: number
    // Supabase returns smallint[] as JSON string array ("2" not 2).
    // Coerce below before comparison.
    sector_ids: Array<number | string> | null
    subsectors: string[] | null
    sectors: string[] | null
  }

  const rows = (gridData ?? []) as GridRow[]

  // Count each root entity once if it touches this sector at all.
  const rootInSector = new Set<number>()
  // For per-subsector counts we want distinct root entities per subsector name.
  const perSubsector: Record<string, Set<number>> = {}
  // Per-sector counts for the "other sectors" footer.
  const perSector: Record<number, Set<number>> = {}

  for (const row of rows) {
    const rowSectorIds = (row.sector_ids ?? [])
      .map((v) => (typeof v === 'number' ? v : parseInt(String(v), 10)))
      .filter((v): v is number => Number.isFinite(v))
    for (const sid of rowSectorIds) {
      if (!perSector[sid]) perSector[sid] = new Set()
      perSector[sid].add(row.entity_id)
    }
    if (!rowSectorIds.includes(sector.sector_id)) continue
    rootInSector.add(row.entity_id)
    for (const subName of row.subsectors ?? []) {
      if (!perSubsector[subName]) perSubsector[subName] = new Set()
      perSubsector[subName].add(row.entity_id)
    }
  }

  const subsectors: SubsectorEntry[] = (subsData ?? []).map((s) => {
    const summary = getSubsectorSummary(s.subsector_name)
    return {
      subsector_name: s.subsector_name,
      subsector_slug: toSlug(s.subsector_name),
      root_count: (perSubsector[s.subsector_name]?.size ?? 0),
      summary_what: summary?.what ?? null,
    }
  })

  const all_sectors = sectors.map((s) => ({
    sector_name: s.sector_name,
    sector_slug: toSlug(s.sector_name),
    entity_count: perSector[s.sector_id]?.size ?? 0,
  }))

  const articles = getArticlesForSector(sector.sector_name, 6)

  return {
    props: {
      sector_name: sector.sector_name,
      sector_slug: toSlug(sector.sector_name),
      description: SECTOR_BLURBS[sector.sector_name] ?? null,
      total_root_entities: rootInSector.size,
      subsectors,
      articles,
      all_sectors,
    },
    revalidate: 3600,
  }
}
