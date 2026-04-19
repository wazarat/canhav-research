import Head from 'next/head'
import Link from 'next/link'
import type { GetStaticProps } from 'next'
import Layout from '../../components/Layout'
import { getAllArticles, type Article } from '../../lib/articles'
import { toSlug } from '../../lib/slug'

/**
 * /research — CAN-NEW-01.
 *
 * In-app research index. Replaces the external Substack link in the nav
 * so article → market-map flow stays on canhav.com. Cards are generated
 * from /content/articles/index.json at build time.
 *
 * Each card offers two CTAs:
 *   - "Read article" → /research/[slug] (or external_url if set)
 *   - "View related entities" → /market-map?sector=…&subsector=…
 *     (depends on CAN-NEW-02 URL-param filtering, already shipped)
 */

interface ResearchIndexProps {
  articles: Article[]
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ResearchIndexPage({ articles }: ResearchIndexProps) {
  return (
    <Layout>
      <Head>
        <title>Research — CanHav</title>
        <meta
          name="description"
          content="Long-form research on Ethereum infrastructure, stablecoins, and DeFi primitives, cross-referenced with the CanHav Market Map."
        />
      </Head>

      <div className="container mx-auto px-6 py-12">
        <header className="max-w-3xl mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
            Research
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold text-white">
            Ethereum infrastructure, decoded.
          </h1>
          <p className="mt-3 text-gray-300 text-base md:text-lg leading-relaxed">
            Deep-dives on stablecoin rails, DeFi primitives, rollup design, and the
            teams building them. Every piece is cross-referenced with the&nbsp;
            <Link href="/market-map" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
              Market Map
            </Link>
            &nbsp;so you can explore the underlying data as you read.
          </p>
        </header>

        {articles.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-10 text-center text-gray-400">
            New research landing soon — in the meantime, check the live&nbsp;
            <Link href="/market-map" className="text-blue-400 hover:text-blue-300 underline">
              Market Map
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        )}

        <section className="mt-16 rounded-2xl border border-gray-800 bg-gradient-to-br from-blue-900/30 to-gray-900/60 p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-white">
                Want the data behind the writing?
              </h2>
              <p className="mt-1 text-gray-300 text-sm md:text-base">
                Every article links back to the Market Map. Dive straight in, filter
                by sector, and save companies for side-by-side comparison.
              </p>
            </div>
            <Link
              href="/market-map"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-lg hover:shadow-blue-500/25"
            >
              Open Market Map
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  )
}

function ArticleCard({ article }: { article: Article }) {
  const readHref =
    article.body.length > 0
      ? `/research/${article.slug}`
      : article.external_url || `/research/${article.slug}`
  const readIsExternal = article.body.length === 0 && !!article.external_url

  const relatedHref = buildRelatedHref(article)

  return (
    <article className="group flex flex-col rounded-2xl border border-gray-800 bg-gray-900/50 hover:border-blue-800/60 hover:bg-gray-900/70 transition-colors overflow-hidden">
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          {article.sector && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300">
              {article.sector}
            </span>
          )}
          {article.published_at && <span>{formatDate(article.published_at)}</span>}
        </div>

        <h3 className="mt-3 text-lg font-semibold text-white leading-snug">
          <Link href={readHref} {...(readIsExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="hover:text-blue-300 transition-colors">
            {article.title}
          </Link>
        </h3>

        {article.summary && (
          <p className="mt-2 text-sm text-gray-300 leading-relaxed flex-1">
            {article.summary}
          </p>
        )}

        <div className="mt-4 text-xs text-gray-500">
          By <span className="text-gray-300">{article.author}</span>
        </div>
      </div>

      <div className="border-t border-gray-800 px-5 py-3 flex items-center justify-between gap-3 bg-gray-900/40">
        <Link
          href={readHref}
          {...(readIsExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-400 hover:text-blue-300"
        >
          Read article
          {readIsExternal ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 4h6m0 0v6m0-6L10 14M6 6h4M6 6v4M6 20h12a2 2 0 002-2v-6" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          )}
        </Link>
        {relatedHref && (
          <Link
            href={relatedHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-blue-300"
          >
            View related entities →
          </Link>
        )}
      </div>
    </article>
  )
}

function buildRelatedHref(article: Article): string | null {
  if (!article.sector && !article.subsector) return '/market-map'
  const params = new URLSearchParams()
  if (article.sector) params.set('sector', toSlug(article.sector))
  if (article.subsector) params.set('subsector', toSlug(article.subsector))
  const qs = params.toString()
  return qs ? `/market-map?${qs}` : '/market-map'
}

export const getStaticProps: GetStaticProps<ResearchIndexProps> = async () => {
  const articles = getAllArticles()
  return { props: { articles } }
}
