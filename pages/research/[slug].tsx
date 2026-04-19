import Head from 'next/head'
import Link from 'next/link'
import type { GetStaticPaths, GetStaticProps } from 'next'
import Layout from '../../components/Layout'
import { getAllArticles, getArticleBySlug, type Article } from '../../lib/articles'
import { toSlug } from '../../lib/slug'

/**
 * /research/[slug] — individual article page (CAN-NEW-01).
 *
 * Renders the body paragraphs from /content/articles/index.json when the
 * article ships in-app; otherwise shows a gentle interstitial with a
 * link to the external canonical URL so we always keep readers oriented
 * (no silent redirect surprises).
 */

interface ArticleDetailProps {
  article: Article
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function ArticleDetailPage({ article }: ArticleDetailProps) {
  const hasBody = article.body.length > 0
  const relatedHref = buildRelatedHref(article)

  return (
    <Layout>
      <Head>
        <title>{article.title} — CanHav Research</title>
        <meta name="description" content={article.summary || article.title} />
      </Head>

      <article className="container mx-auto px-6 py-12 max-w-3xl">
        <nav className="text-sm text-gray-400 mb-6">
          <Link href="/research" className="hover:text-blue-300">
            ← Back to Research
          </Link>
        </nav>

        <header className="mb-8">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            {article.sector && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300">
                {article.sector}
              </span>
            )}
            {article.subsector && <span>›</span>}
            {article.subsector && <span className="text-gray-300">{article.subsector}</span>}
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold text-white leading-tight">
            {article.title}
          </h1>
          {article.summary && (
            <p className="mt-3 text-lg text-gray-300 leading-relaxed">{article.summary}</p>
          )}
          <div className="mt-4 text-sm text-gray-400">
            By <span className="text-gray-200">{article.author}</span>
            {article.published_at && <> &nbsp;·&nbsp; {formatDate(article.published_at)}</>}
          </div>
        </header>

        {hasBody ? (
          <div className="prose-like space-y-5 text-gray-200 leading-relaxed">
            {article.body.map((paragraph, idx) => (
              <p key={idx} className="text-base md:text-[17px] leading-[1.75]">
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 md:p-8">
            <p className="text-gray-300">
              The full piece lives on our writing home. Head there to read it in
              the format it was meant to be read.
            </p>
            {article.external_url && (
              <a
                href={article.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                Read on research.canhav.com
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 4h6m0 0v6m0-6L10 14M6 6h4M6 6v4M6 20h12a2 2 0 002-2v-6" />
                </svg>
              </a>
            )}
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-gray-400">
            Want to follow the data referenced here?
          </div>
          {relatedHref && (
            <Link
              href={relatedHref}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
            >
              Open in Market Map
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          )}
        </div>
      </article>
    </Layout>
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

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: getAllArticles().map((a) => ({ params: { slug: a.slug } })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps<ArticleDetailProps, { slug: string }> = async (
  ctx
) => {
  const slug = ctx.params?.slug
  if (!slug) return { notFound: true }
  const article = getArticleBySlug(slug)
  if (!article) return { notFound: true }
  return { props: { article } }
}
