'use client'

import { FormEvent, useState } from 'react'

/**
 * Inline edit form for a single public.entities row. Mounted inside
 * CompanyDetailDrawer and only rendered for super-admins.
 *
 * Every field backs exactly one column from migration 009 (or the
 * existing company-level columns from migration 004). Array fields
 * (tags, founders, investors, chains) accept a comma-separated string;
 * the PATCH API splits them.
 *
 * On submit we call PATCH /api/admin/entities/[id] and invoke
 * `onSaved()` with the updated row so the drawer can refresh in place.
 */

export interface EntityEditable {
  entity_id: number
  entity_name: string
  canonical_website: string | null
  logo_url: string | null
  year_founded: number | null
  hq_location: string | null
  funding_stage: string | null
  twitter_handle: string | null
  github_org: string | null
  tags: string[] | null
  long_description: string | null
  founders: string[] | null
  total_funding_usd: number | null
  last_funding_date: string | null
  investors: string[] | null
  token_symbol: string | null
  chains: string[] | null
  linkedin_url: string | null
  discord_url: string | null
  telegram_url: string | null
  farcaster_handle: string | null
  status: string | null
}

const STATUS_OPTIONS = ['', 'active', 'acquired', 'defunct', 'fork', 'unknown'] as const

function arr(val: string[] | null | undefined): string {
  return (val ?? []).join(', ')
}

export default function EntityEditForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: EntityEditable
  onCancel: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    entity_name: initial.entity_name ?? '',
    long_description: initial.long_description ?? '',
    canonical_website: initial.canonical_website ?? '',
    logo_url: initial.logo_url ?? '',
    hq_location: initial.hq_location ?? '',
    year_founded: initial.year_founded != null ? String(initial.year_founded) : '',
    funding_stage: initial.funding_stage ?? '',
    total_funding_usd:
      initial.total_funding_usd != null ? String(initial.total_funding_usd) : '',
    last_funding_date: initial.last_funding_date ?? '',
    status: initial.status ?? '',
    token_symbol: initial.token_symbol ?? '',
    investors: arr(initial.investors),
    chains: arr(initial.chains),
    founders: arr(initial.founders),
    tags: arr(initial.tags),
    twitter_handle: initial.twitter_handle ?? '',
    github_org: initial.github_org ?? '',
    linkedin_url: initial.linkedin_url ?? '',
    discord_url: initial.discord_url ?? '',
    telegram_url: initial.telegram_url ?? '',
    farcaster_handle: initial.farcaster_handle ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    // Only ship fields that changed. Send empty strings as null to clear.
    const payload: Record<string, unknown> = {}
    const mapDiff = (
      key: keyof typeof form,
      original: string | number | null
    ) => {
      const newVal = form[key]
      const origStr = original == null ? '' : String(original)
      if (newVal !== origStr) {
        payload[key as string] = newVal === '' ? null : newVal
      }
    }

    mapDiff('entity_name', initial.entity_name)
    mapDiff('long_description', initial.long_description)
    mapDiff('canonical_website', initial.canonical_website)
    mapDiff('logo_url', initial.logo_url)
    mapDiff('hq_location', initial.hq_location)
    mapDiff('year_founded', initial.year_founded)
    mapDiff('funding_stage', initial.funding_stage)
    mapDiff('total_funding_usd', initial.total_funding_usd)
    mapDiff('last_funding_date', initial.last_funding_date)
    mapDiff('status', initial.status)
    mapDiff('token_symbol', initial.token_symbol)
    mapDiff('twitter_handle', initial.twitter_handle)
    mapDiff('github_org', initial.github_org)
    mapDiff('linkedin_url', initial.linkedin_url)
    mapDiff('discord_url', initial.discord_url)
    mapDiff('telegram_url', initial.telegram_url)
    mapDiff('farcaster_handle', initial.farcaster_handle)
    // Arrays: compare by joined string for simplicity; API re-splits.
    if (form.investors !== arr(initial.investors)) payload.investors = form.investors
    if (form.chains !== arr(initial.chains)) payload.chains = form.chains
    if (form.founders !== arr(initial.founders)) payload.founders = form.founders
    if (form.tags !== arr(initial.tags)) payload.tags = form.tags

    if (Object.keys(payload).length === 0) {
      setSubmitting(false)
      onCancel()
      return
    }

    try {
      const res = await fetch(`/api/admin/entities/${initial.entity_id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Edit entity</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-blue-300"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <Field label="Name">
        <Text value={form.entity_name} onChange={(v) => set('entity_name', v)} />
      </Field>

      <Field label="Long description" hint="One authoritative blurb (shows on the detail page).">
        <Textarea value={form.long_description} rows={4} onChange={(v) => set('long_description', v)} />
      </Field>

      <Grid2>
        <Field label="Website"><Text value={form.canonical_website} onChange={(v) => set('canonical_website', v)} placeholder="https://…" /></Field>
        <Field label="Logo URL"><Text value={form.logo_url} onChange={(v) => set('logo_url', v)} placeholder="https://…/logo.png" /></Field>
      </Grid2>

      <Grid2>
        <Field label="HQ"><Text value={form.hq_location} onChange={(v) => set('hq_location', v)} /></Field>
        <Field label="Founded"><Text value={form.year_founded} onChange={(v) => set('year_founded', v)} placeholder="2019" /></Field>
      </Grid2>

      <Grid2>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt || '—'}</option>
            ))}
          </select>
        </Field>
        <Field label="Funding stage"><Text value={form.funding_stage} onChange={(v) => set('funding_stage', v)} placeholder="Series B" /></Field>
      </Grid2>

      <Grid2>
        <Field label="Total funding (USD)"><Text value={form.total_funding_usd} onChange={(v) => set('total_funding_usd', v)} placeholder="150000000" /></Field>
        <Field label="Last funding date"><Text value={form.last_funding_date} onChange={(v) => set('last_funding_date', v)} placeholder="2024-11-12" /></Field>
      </Grid2>

      <Field label="Investors" hint="Comma-separated.">
        <Text value={form.investors} onChange={(v) => set('investors', v)} placeholder="Paradigm, a16z, Sequoia" />
      </Field>

      <Grid2>
        <Field label="Token symbol"><Text value={form.token_symbol} onChange={(v) => set('token_symbol', v)} placeholder="UNI" /></Field>
        <Field label="Chains" hint="Comma-separated."><Text value={form.chains} onChange={(v) => set('chains', v)} placeholder="ethereum, arbitrum" /></Field>
      </Grid2>

      <Field label="Founders" hint="Comma-separated.">
        <Text value={form.founders} onChange={(v) => set('founders', v)} placeholder="Alice Smith, Bob Jones" />
      </Field>

      <Field label="Tags" hint="Comma-separated.">
        <Text value={form.tags} onChange={(v) => set('tags', v)} />
      </Field>

      <div className="pt-2 border-t border-gray-100" />

      <Grid2>
        <Field label="Twitter handle"><Text value={form.twitter_handle} onChange={(v) => set('twitter_handle', v)} placeholder="without @" /></Field>
        <Field label="GitHub org"><Text value={form.github_org} onChange={(v) => set('github_org', v)} /></Field>
      </Grid2>
      <Grid2>
        <Field label="LinkedIn URL"><Text value={form.linkedin_url} onChange={(v) => set('linkedin_url', v)} /></Field>
        <Field label="Discord URL"><Text value={form.discord_url} onChange={(v) => set('discord_url', v)} /></Field>
      </Grid2>
      <Grid2>
        <Field label="Telegram URL"><Text value={form.telegram_url} onChange={(v) => set('telegram_url', v)} /></Field>
        <Field label="Farcaster handle"><Text value={form.farcaster_handle} onChange={(v) => set('farcaster_handle', v)} placeholder="without @" /></Field>
      </Grid2>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="mt-0.5 text-[10px] text-gray-400">{hint}</p>}
    </div>
  )
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function Text({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  )
}

function Textarea({
  value,
  onChange,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
    />
  )
}
