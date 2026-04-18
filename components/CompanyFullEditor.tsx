'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import EntityEditForm, { EntityEditable } from './EntityEditForm'

/**
 * Tabbed editor for a single root entity, mounted from the super-admin Edit
 * button on /company/[id]. Three groups of fields, one per tab:
 *
 *   1. "Master data"           → public.entities              (PATCH /api/admin/entities/[id])
 *   2. "<Subsector>" (one per) → public.entity_classifications (PATCH /api/admin/classifications/[id])
 *                              + public.subsector_data_<slug> (PATCH /api/admin/subsector-data/[sid]/[eid])
 *
 * The component is "dumb" about where the data lives — it takes the already-
 * fetched classifications array from /company/[id] and fetches the dynamic
 * subsector datapoint rows on mount via /api/company/[id]/subsector-data
 * (which super-admins have access to because they're also signed-in viewers).
 */

export interface EditorClassification {
  entity_classification_id: number
  entity_id: number
  entity_name: string
  sector_id: number
  sector_name: string
  subsector_id: number
  subsector_name: string
  is_primary: boolean
  description: string
  website: string
  maintaining_organization: string
  reason_for_inclusion: string
  practitioners_note: string
  practitioner_validation_check: string
}

interface SchemaCol {
  key: string
  label?: string
  type?: string
  is_url?: boolean
  is_long?: boolean
}

interface SubsectorBlock {
  subsector_id: number
  subsector_name: string
  sector_name: string
  is_primary: boolean
  table_name: string | null
  display_schema: SchemaCol[]
  data: Record<string, unknown> | null
}

type TabKey = 'master' | `cls-${number}`

export default function CompanyFullEditor({
  entity,
  classifications,
  onClose,
  onSaved,
}: {
  entity: EntityEditable
  classifications: EditorClassification[]
  onClose: () => void
  onSaved: () => void
}) {
  const [blocks, setBlocks] = useState<SubsectorBlock[]>([])
  const [blocksLoading, setBlocksLoading] = useState(true)
  const [active, setActive] = useState<TabKey>('master')

  // Primary-first ordering so the tab most users care about sits leftmost.
  const orderedClassifications = useMemo(() => {
    return [...classifications].sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
      return a.subsector_name.localeCompare(b.subsector_name)
    })
  }, [classifications])

  useEffect(() => {
    let cancelled = false
    setBlocksLoading(true)
    fetch(`/api/company/${entity.entity_id}/subsector-data`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { blocks: [] }))
      .then((body) => {
        if (cancelled) return
        const received = Array.isArray(body?.blocks) ? (body.blocks as SubsectorBlock[]) : []
        setBlocks(received)
      })
      .catch(() => setBlocks([]))
      .finally(() => !cancelled && setBlocksLoading(false))
    return () => {
      cancelled = true
    }
  }, [entity.entity_id])

  const blockBySubsectorId = useMemo(() => {
    const m = new Map<number, SubsectorBlock>()
    for (const b of blocks) m.set(b.subsector_id, b)
    return m
  }, [blocks])

  const activeClassification = useMemo(() => {
    if (!active.startsWith('cls-')) return null
    const id = Number(active.slice(4))
    return orderedClassifications.find((c) => c.entity_classification_id === id) ?? null
  }, [active, orderedClassifications])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-6 md:pt-10 px-4 bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Edit {entity.entity_name}</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Master-data columns plus per-subsector classification & datapoints.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <nav className="px-3 pt-2 border-b border-gray-200 bg-gray-50/60 flex gap-1 overflow-x-auto">
          <TabButton active={active === 'master'} onClick={() => setActive('master')}>
            Master data
          </TabButton>
          {orderedClassifications.map((c) => {
            const key: TabKey = `cls-${c.entity_classification_id}`
            return (
              <TabButton
                key={key}
                active={active === key}
                onClick={() => setActive(key)}
                badge={c.is_primary ? 'Primary' : undefined}
              >
                {c.subsector_name}
              </TabButton>
            )
          })}
        </nav>

        <div className="overflow-y-auto flex-1 min-h-0">
          {active === 'master' && (
            <EntityEditForm
              initial={entity}
              onCancel={onClose}
              onSaved={() => {
                onSaved()
              }}
            />
          )}
          {active !== 'master' && activeClassification && (
            <ClassificationEditor
              key={activeClassification.entity_classification_id}
              classification={activeClassification}
              block={blockBySubsectorId.get(activeClassification.subsector_id) ?? null}
              blocksLoading={blocksLoading}
              onDone={() => {
                onSaved()
              }}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Per-classification editor: descriptive fields + dynamic subsector datapoints.
// Each save is independent so the admin can save the classification blurb
// without also having to touch the subsector row (and vice versa).
// -----------------------------------------------------------------------------

function ClassificationEditor({
  classification,
  block,
  blocksLoading,
  onDone,
  onCancel,
}: {
  classification: EditorClassification
  block: SubsectorBlock | null
  blocksLoading: boolean
  onDone: () => void
  onCancel: () => void
}) {
  return (
    <div className="divide-y divide-gray-100">
      <ClassificationFieldsForm classification={classification} onSaved={onDone} onCancel={onCancel} />
      {blocksLoading ? (
        <div className="p-5 text-xs text-gray-500">Loading subsector datapoints…</div>
      ) : block && block.table_name && block.display_schema?.length ? (
        <SubsectorDataForm
          subsectorId={classification.subsector_id}
          entityId={classification.entity_id}
          subsectorName={classification.subsector_name}
          tableName={block.table_name}
          schema={block.display_schema}
          initial={block.data ?? {}}
          onSaved={onDone}
        />
      ) : (
        <div className="p-5 text-xs text-gray-500">
          No subsector datapoints registered for <span className="font-medium">{classification.subsector_name}</span> yet.
        </div>
      )}
    </div>
  )
}

function ClassificationFieldsForm({
  classification,
  onSaved,
  onCancel,
}: {
  classification: EditorClassification
  onSaved: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    description: classification.description ?? '',
    reason_for_inclusion: classification.reason_for_inclusion ?? '',
    practitioners_note: classification.practitioners_note ?? '',
    practitioner_validation_check: classification.practitioner_validation_check ?? '',
    website: classification.website ?? '',
    maintaining_organization: classification.maintaining_organization ?? '',
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

    const payload: Record<string, string | null> = {}
    const mapDiff = (key: keyof typeof form, original: string | null | undefined) => {
      const origStr = original ?? ''
      if (form[key] !== origStr) payload[key] = form[key] === '' ? null : form[key]
    }
    mapDiff('description', classification.description)
    mapDiff('reason_for_inclusion', classification.reason_for_inclusion)
    mapDiff('practitioners_note', classification.practitioners_note)
    mapDiff('practitioner_validation_check', classification.practitioner_validation_check)
    mapDiff('website', classification.website)
    mapDiff('maintaining_organization', classification.maintaining_organization)

    if (Object.keys(payload).length === 0) {
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch(
        `/api/admin/classifications/${classification.entity_classification_id}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
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
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {classification.subsector_name} · classification
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Per-subsector blurb shown on the profile.
          </p>
        </div>
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
            {submitting ? 'Saving…' : 'Save classification'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <Field label="Description" hint="Short blurb for this subsector card.">
        <Textarea rows={3} value={form.description} onChange={(v) => set('description', v)} />
      </Field>
      <Field label="Reason for inclusion">
        <Textarea rows={3} value={form.reason_for_inclusion} onChange={(v) => set('reason_for_inclusion', v)} />
      </Field>
      <Field label="Practitioner's note">
        <Textarea rows={2} value={form.practitioners_note} onChange={(v) => set('practitioners_note', v)} />
      </Field>
      <Field label="Validation check">
        <Textarea rows={2} value={form.practitioner_validation_check} onChange={(v) => set('practitioner_validation_check', v)} />
      </Field>
      <Grid2>
        <Field label="Subsector website" hint="If different from the company's canonical site.">
          <Text value={form.website} onChange={(v) => set('website', v)} placeholder="https://…" />
        </Field>
        <Field label="Maintaining organization">
          <Text value={form.maintaining_organization} onChange={(v) => set('maintaining_organization', v)} />
        </Field>
      </Grid2>
    </form>
  )
}

function SubsectorDataForm({
  subsectorId,
  entityId,
  subsectorName,
  tableName,
  schema,
  initial,
  onSaved,
}: {
  subsectorId: number
  entityId: number
  subsectorName: string
  tableName: string
  schema: SchemaCol[]
  initial: Record<string, unknown>
  onSaved: () => void
}) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {}
    for (const col of schema) {
      const v = initial[col.key]
      seed[col.key] = v == null ? '' : typeof v === 'string' ? v : String(v)
    }
    return seed
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    // Only send changed keys. For comparison we normalise initial to the
    // same string shape used in the form state.
    const payload: Record<string, string | null> = {}
    for (const col of schema) {
      const initVal = initial[col.key]
      const initStr = initVal == null ? '' : typeof initVal === 'string' ? initVal : String(initVal)
      if (form[col.key] !== initStr) {
        payload[col.key] = form[col.key] === '' ? null : form[col.key]
      }
    }

    if (Object.keys(payload).length === 0) {
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch(
        `/api/admin/subsector-data/${subsectorId}/${entityId}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
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
    <form onSubmit={onSubmit} className="p-5 space-y-4 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {subsectorName} · datapoints
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Table <code className="font-mono">{tableName}</code> · {schema.length} field{schema.length === 1 ? '' : 's'}.
          </p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-blue-300"
        >
          {submitting ? 'Saving…' : 'Save datapoints'}
        </button>
      </div>

      {error && (
        <div className="p-2.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
        {schema.map((col) => {
          const label = col.label ?? humanize(col.key)
          const isLong = !!col.is_long || (col.type ?? '').toLowerCase() === 'text' || label.length > 32
          const input = isLong ? (
            <Textarea rows={3} value={form[col.key] ?? ''} onChange={(v) => set(col.key, v)} />
          ) : (
            <Text value={form[col.key] ?? ''} onChange={(v) => set(col.key, v)} placeholder={col.is_url ? 'https://…' : ''} />
          )
          return (
            <div key={col.key} className={isLong ? 'md:col-span-2' : ''}>
              <Field label={label} hint={col.type && col.type !== 'text' ? col.type : undefined}>
                {input}
              </Field>
            </div>
          )
        })}
      </div>
    </form>
  )
}

// -----------------------------------------------------------------------------
// Tiny local UI primitives (kept here so the file is self-contained).
// -----------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  badge?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-md transition-colors border ${
        active
          ? 'bg-white border-gray-300 text-gray-900 shadow-sm'
          : 'bg-transparent border-transparent text-gray-600 hover:text-gray-900 hover:bg-white/70'
      }`}
    >
      {children}
      {badge && (
        <span className="ml-1.5 text-[10px] uppercase tracking-wide text-blue-600">
          {badge}
        </span>
      )}
    </button>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
    </label>
  )
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
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
      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  )
}

function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
