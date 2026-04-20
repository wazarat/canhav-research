import type { NextApiRequest } from 'next'
import type { AdminSession } from './adminAuth'
import { getSupabaseAdmin } from './supabaseNew'

/**
 * Write a row into public.admin_edits describing a single inline edit.
 *
 * `before` and `after` should be the *same-shape* dictionaries keyed by
 * column name — we emit only the fields whose values actually differ
 * (deep-equal for arrays, shallow for scalars). Absent keys are ignored.
 *
 * Intentionally fire-and-forget for the caller: we log errors but never
 * throw, so a flaky audit insert can't block a legitimate data edit. The
 * underlying service-role client bypasses RLS.
 */
export type AdminEditTarget = 'entity' | 'classification' | 'subsector_data'

export interface LogAdminEditArgs {
  session: AdminSession
  targetType: AdminEditTarget
  targetId: number | string
  entityId?: number | null
  before: Record<string, unknown>
  after: Record<string, unknown>
  note?: string | null
  source?: string | null
  req?: NextApiRequest
}

export async function logAdminEdit(args: LogAdminEditArgs): Promise<void> {
  try {
    const changes: Record<string, { before: unknown; after: unknown }> = {}
    const keys = new Set([
      ...Object.keys(args.before ?? {}),
      ...Object.keys(args.after ?? {}),
    ])
    for (const k of Array.from(keys)) {
      const b = (args.before ?? {})[k]
      const a = (args.after ?? {})[k]
      if (equalish(b, a)) continue
      changes[k] = { before: b ?? null, after: a ?? null }
    }
    if (Object.keys(changes).length === 0) return // nothing to log

    const targetIdNum =
      typeof args.targetId === 'string'
        ? parseInt(args.targetId, 10)
        : args.targetId
    if (!Number.isFinite(targetIdNum)) return

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('admin_edits').insert({
      actor_user_id: args.session.user.id,
      actor_email: args.session.user.email,
      actor_role: args.session.role,
      target_type: args.targetType,
      target_id: targetIdNum,
      entity_id: args.entityId ?? null,
      changes,
      note: args.note ?? null,
      source: args.source ?? null,
      user_agent:
        (args.req?.headers['user-agent'] as string | undefined) ?? null,
    })
    if (error) {
      console.warn('[logAdminEdit] insert failed:', error.message)
    }
  } catch (err) {
    console.warn('[logAdminEdit] unexpected:', err)
  }
}

function equalish(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null && b == null) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!equalish(a[i], b[i])) return false
    }
    return true
  }
  // Dates as ISO strings fall through to ===. Objects we don't diff
  // deeply because our edit payloads are always scalars or string[].
  return false
}
