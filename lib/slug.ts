// Shared slugify + lookup helpers for sector / subsector URL params.
//
// The market map keeps its filter state in the URL as
//   ?sector=<slug>,<slug>&subsector=<slug>,<slug>&q=<text>
// and a few other pages (company CTA, sector landing pages) need to build
// compatible URLs from sector/subsector names. Everything funnels through
// `toSlug()` so we don't drift.
//
// `toSlug("Monetary & Access Rails")` -> "monetary-and-access-rails"
// `toSlug("L3 & Appchain Frameworks")` -> "l3-and-appchain-frameworks"

export function toSlug(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Resolve a slug back to the first matching option label. Case-insensitive
// and tolerant of the user pasting the raw sector name with special chars.
export function fromSlug(slug: string, options: readonly string[]): string | null {
  if (!slug) return null
  const target = slug.toLowerCase()
  for (const option of options) {
    if (toSlug(option) === target) return option
  }
  // Fallback: literal match (user pasted the full name by hand).
  for (const option of options) {
    if (option.toLowerCase() === target) return option
  }
  return null
}

// Parse a URL query value that may be a comma-joined string or an array
// (Next router types both shapes). Returns a trimmed, non-empty string
// array in original order, de-duplicated.
export function parseMultiParam(raw: string | string[] | undefined | null): string[] {
  if (!raw) return []
  const flat = Array.isArray(raw) ? raw.join(',') : raw
  const out: string[] = []
  const seen = new Set<string>()
  for (const part of flat.split(',')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    if (seen.has(trimmed.toLowerCase())) continue
    seen.add(trimmed.toLowerCase())
    out.push(trimmed)
  }
  return out
}
