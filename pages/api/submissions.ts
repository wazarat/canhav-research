import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '../../lib/supabaseNew'
import { getViewer } from '../../lib/viewerAuth'

/**
 * /api/submissions (POST) — CAN-NEW-10.
 *
 * Public endpoint accepting the "Submit a company" form. Anyone can POST
 * (even anonymous users), but we attach auth.uid() when the visitor is
 * signed in so super-admins can later prioritise submissions from known
 * researchers.
 *
 * Rate limiting is intentionally naïve here — we trust the front-end to
 * throttle, and the RLS policy blocks any reads from non-super-admins.
 */

interface SubmitBody {
  name?: string
  website?: string
  subsector_id?: number | string | null
  notes?: string
  submitter_email?: string
  source?: string
}

function isLikelyHttpUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    return !!url.hostname && url.hostname.includes('.')
  } catch {
    return false
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = (req.body ?? {}) as SubmitBody
  const name = (body.name ?? '').trim()
  const website = (body.website ?? '').trim()
  const notes = (body.notes ?? '').trim()
  const submitterEmailRaw = (body.submitter_email ?? '').trim()
  const source = (body.source ?? 'market-map').trim() || 'market-map'
  const subsectorIdRaw = body.subsector_id
  let subsectorId: number | null = null
  if (subsectorIdRaw != null && subsectorIdRaw !== '') {
    const parsed = typeof subsectorIdRaw === 'number' ? subsectorIdRaw : parseInt(String(subsectorIdRaw), 10)
    if (!Number.isNaN(parsed)) subsectorId = parsed
  }

  if (!name || name.length < 2 || name.length > 200) {
    return res.status(400).json({ error: 'Please enter a company name (2-200 chars).' })
  }
  if (!website || !isLikelyHttpUrl(website)) {
    return res.status(400).json({ error: 'Please enter a valid website.' })
  }
  if (notes.length > 2000) {
    return res.status(400).json({ error: 'Notes are too long (max 2000 chars).' })
  }
  if (submitterEmailRaw && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(submitterEmailRaw)) {
    return res.status(400).json({ error: 'Please enter a valid email.' })
  }

  // If the visitor is signed in, attach their uid/email for admin context.
  const viewer = await getViewer(req, res).catch(() => null)
  const submittedBy = viewer?.user.id ?? null
  const submitterEmail = submitterEmailRaw || viewer?.user.email || null

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('submissions')
    .insert({
      name,
      website,
      subsector_id: subsectorId,
      notes: notes || null,
      submitted_by: submittedBy,
      submitter_email: submitterEmail,
      source,
      status: 'pending',
    })
    .select('submission_id')
    .maybeSingle()

  if (error) {
    console.error('[submissions.insert]', error)
    return res.status(500).json({ error: 'Could not record submission. Please try again.' })
  }

  return res.status(201).json({
    ok: true,
    submission_id: data?.submission_id ?? null,
  })
}
