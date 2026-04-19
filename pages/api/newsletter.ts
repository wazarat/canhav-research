import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '../../lib/supabaseNew'
import { getViewer } from '../../lib/viewerAuth'

/**
 * /api/newsletter (POST) — CAN-NEW-05.
 *
 * Minimal newsletter signup endpoint backed by public.newsletter_signups.
 * Stays provider-agnostic: once a decision is made on Substack / ConvertKit
 * / Beehiiv, this handler forwards the email to that provider alongside
 * (or instead of) the local insert.
 *
 * Idempotent on (lower(email)) via the unique index — repeat signups
 * update updated_at and the source, without erroring.
 */

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

interface Body {
  email?: string
  source?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = (req.body ?? {}) as Body
  const email = (body.email ?? '').trim()
  const source = (body.source ?? 'footer').trim() || 'footer'

  if (!email || email.length > 200 || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  const viewer = await getViewer(req, res).catch(() => null)

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('newsletter_signups')
    .upsert(
      {
        email,
        source,
        submitted_by: viewer?.user.id ?? null,
        status: 'pending',
      },
      { onConflict: 'email_lower' }
    )

  if (error) {
    console.error('[newsletter.upsert]', error)
    return res.status(500).json({ error: 'Could not save your email. Please try again.' })
  }

  return res.status(201).json({ ok: true })
}
