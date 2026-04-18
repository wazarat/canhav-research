import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/adminAuth'
import { getSupabaseAdmin } from '../../../lib/supabaseNew'

/**
 * GET /api/admin/merge-candidates
 *   ?search=<substr>     — optional fuzzy match against base_name / member names
 *   ?min_confidence=<n>  — filter low-quality suggestions (default 0)
 *   ?include=recent_merges (boolean)
 *
 * Returns { groups: CandidateGroup[], recent_merges?: MergeRow[] }. Each
 * group already contains every member's classifications inlined so the
 * admin UI can render side-by-side previews with zero additional round-trips.
 */

export interface CandidateMember {
  entity_id: number
  entity_name: string
  canonical_website: string | null
  logo_url: string | null
  domain: string | null
  primary_sector: string | null
  classification_count: number
  classifications: Array<{
    entity_classification_id: number
    sector_name: string
    subsector_name: string
    description: string | null
    website: string | null
    is_primary: boolean
  }>
}

export interface CandidateGroup {
  base_name: string
  member_count: number
  member_ids: number[]
  member_names: string[]
  members: CandidateMember[]
  same_primary_sector: boolean
  shared_domain: boolean
  avg_similarity: number
  confidence: number
  never_merge_edges: Array<{ a: number; b: number; reason: string | null }>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res)
  if (!session) return
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const search = (req.query.search as string | undefined)?.trim().toLowerCase() ?? ''
  const minConfidence = parseFloat((req.query.min_confidence as string) ?? '0') || 0
  const includeRecent = req.query.include === 'recent_merges'

  const supabase = getSupabaseAdmin()

  try {
    const { data: groupRows, error: groupErr } = await supabase
      .from('v_merge_candidate_groups')
      .select('*')
      .gte('confidence', minConfidence)

    if (groupErr) {
      console.error('[merge-candidates] view error:', groupErr)
      return res.status(500).json({ error: 'Failed to load candidates' })
    }

    // Collect every member entity_id so we can fetch all classifications in
    // one query and stitch them into the response.
    const memberIds: number[] = []
    for (const g of groupRows ?? []) {
      for (const id of (g.member_ids as number[]) ?? []) memberIds.push(id)
    }

    const { data: classRows, error: classErr } = memberIds.length
      ? await supabase
          .from('v_entity_detail')
          .select(
            'entity_id, entity_classification_id, sector_name, subsector_name, description, website, is_primary'
          )
          .in('entity_id', memberIds)
      : { data: [] as any[], error: null }

    if (classErr) {
      console.error('[merge-candidates] classifications error:', classErr)
      return res.status(500).json({ error: 'Failed to load classifications' })
    }

    const classByEntity = new Map<number, CandidateMember['classifications']>()
    for (const row of (classRows ?? []) as any[]) {
      const arr = classByEntity.get(row.entity_id) ?? []
      arr.push({
        entity_classification_id: row.entity_classification_id,
        sector_name: row.sector_name ?? '',
        subsector_name: row.subsector_name ?? '',
        description: row.description ?? null,
        website: row.website ?? null,
        is_primary: !!row.is_primary,
      })
      classByEntity.set(row.entity_id, arr)
    }

    const groups: CandidateGroup[] = (groupRows ?? []).map((g: any) => {
      const members: CandidateMember[] = (g.members ?? []).map((m: any) => ({
        entity_id: m.entity_id,
        entity_name: m.entity_name,
        canonical_website: m.canonical_website ?? null,
        logo_url: m.logo_url ?? null,
        domain: m.domain ?? null,
        primary_sector: m.primary_sector ?? null,
        classification_count: m.classification_count ?? 0,
        classifications: classByEntity.get(m.entity_id) ?? [],
      }))
      return {
        base_name: g.base_name,
        member_count: g.member_count,
        member_ids: g.member_ids ?? [],
        member_names: g.member_names ?? [],
        members,
        same_primary_sector: !!g.same_primary_sector,
        shared_domain: !!g.shared_domain,
        avg_similarity: Number(g.avg_similarity ?? 0),
        confidence: Number(g.confidence ?? 0),
        never_merge_edges: g.never_merge_edges ?? [],
      }
    })

    // Optional substring search across base_name + every member name.
    const filtered = search
      ? groups.filter(
          (g) =>
            g.base_name.includes(search) ||
            g.member_names.some((n) => n.toLowerCase().includes(search))
        )
      : groups

    let recentMerges: any[] | undefined
    if (includeRecent) {
      const { data: m } = await supabase
        .from('entity_merges')
        .select(
          'merge_id, parent_entity_id, child_entity_id, merged_at, merged_by, reason, reverted_at, snapshot'
        )
        .order('merged_at', { ascending: false })
        .limit(50)
      recentMerges = m ?? []
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0')
    return res.status(200).json({
      groups: filtered,
      ...(includeRecent ? { recent_merges: recentMerges } : {}),
    })
  } catch (err) {
    console.error('[merge-candidates] unexpected:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
