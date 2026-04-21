'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Inline merge flow, opened from CompanyDetailDrawer for super-admins.
 *
 * Two steps:
 *
 * 1. "Pick" — search for another root entity, choose the merge direction:
 *      * Make <source> a child of <target>
 *      * Make <target> a child of <source>
 *    …and set an optional reason.
 *
 * 2. "Reconcile" — POST /api/admin/merge-preview and render every column
 *    side-by-side. The admin picks, per field:
 *      * Keep parent (default)
 *      * Use child's value (overwrites the parent)
 *      * Merge (arrays only: union parent ∪ child)
 *    Conflicting rows are highlighted; agreeing rows collapse into a
 *    "No changes" panel the admin can expand.
 *
 * 3. "Apply" — POST /api/admin/merge-entities with
 *    { parent_entity_id, child_entity_ids: [child], reason,
 *      field_resolutions: { [child_id]: { field: choice } } }
 *    The server applies the chosen values to the parent row in the same
 *    step as flipping parent_entity_id on the child, snapshotting the
 *    pre-merge parent so unmerge can restore both sides.
 */

export interface MergeSource {
  entity_id: number
  entity_name: string
  canonical_website?: string | null
}

interface Candidate {
  entity_id: number
  name: string
  canonical_website?: string | null
  sector?: string
  subsector?: string
}

type Resolution = 'parent' | 'child' | 'union'

type FieldKind = 'scalar' | 'text' | 'array' | 'bool'

interface PreviewField {
  key: string
  label: string
  kind: FieldKind
  parent_value: unknown
  child_value: unknown
  parent_empty: boolean
  child_empty: boolean
  equal: boolean
  conflict: boolean
  union_value: string[] | null
  default_resolution: Resolution
}

interface ClassificationGroup {
  subsector_id: number
  subsector_name: string
  sector_name: string
  parent_classification_id: number
  child_classification_id: number
  parent_is_primary: boolean
  child_is_primary: boolean
  fields: PreviewField[]
  conflict_count: number
}

interface SideOnlyClassification {
  subsector_id: number
  subsector_name: string
  sector_name: string
  classification_id: number
  is_primary: boolean
}

interface PreviewResponse {
  parent: { entity_id: number; entity_name: string }
  child: {
    entity_id: number
    entity_name: string
    already_child_of_parent: boolean
    currently_under_different_parent: number | null
  }
  fields: PreviewField[]
  classification_groups?: ClassificationGroup[]
  parent_only_classifications?: SideOnlyClassification[]
  child_only_classifications?: SideOnlyClassification[]
}

// Nested per-classification resolutions keyed by subsector_id.
// Picker only surfaces 'parent' / 'child' for classification fields.
type ClassFieldResolution = 'parent' | 'child'
type ClassificationResolutions = Record<string, Record<string, ClassFieldResolution>>

type Step = 'pick' | 'reconcile'

export default function MergeWithPicker({
  source,
  onClose,
  onMerged,
}: {
  source: MergeSource
  onClose: () => void
  onMerged: () => void
}) {
  const [step, setStep] = useState<Step>('pick')
  const [query, setQuery] = useState('')
  const [all, setAll] = useState<Candidate[] | null>(null)
  const [picked, setPicked] = useState<Candidate | null>(null)
  const [direction, setDirection] = useState<'source_child' | 'target_child'>(
    'source_child'
  )
  const [reason, setReason] = useState('')
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({})
  const [classResolutions, setClassResolutions] = useState<ClassificationResolutions>({})
  const [showUnchanged, setShowUnchanged] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const parentId =
    direction === 'source_child'
      ? picked?.entity_id ?? null
      : source.entity_id
  const childId =
    direction === 'source_child'
      ? source.entity_id
      : picked?.entity_id ?? null
  const parentName =
    direction === 'source_child' ? picked?.name ?? '' : source.entity_name
  const childName =
    direction === 'source_child' ? source.entity_name : picked?.name ?? ''

  useEffect(() => {
    if (step === 'pick') inputRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, step])

  useEffect(() => {
    let cancel = false
    fetch('/api/companies', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => {
        if (cancel) return
        const rows: Candidate[] = (body.companies ?? []).map((c: any) => ({
          entity_id: c.entity_id,
          name: c.name,
          canonical_website: c.canonical_website,
          sector: c.sector,
          subsector: c.subsector,
        }))
        setAll(rows)
      })
      .catch(() => setAll([]))
    return () => {
      cancel = true
    }
  }, [])

  const matches = useMemo(() => {
    if (!all) return []
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return all
      .filter(
        (c) =>
          c.entity_id !== source.entity_id &&
          c.name.toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [all, query, source.entity_id])

  async function fetchPreview() {
    if (!parentId || !childId) return
    setPreviewLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/merge-preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ parent_entity_id: parentId, child_entity_id: childId }),
      })
      const body = (await res.json().catch(() => ({}))) as
        | PreviewResponse
        | { error?: string }
      if (!res.ok) {
        throw new Error(
          (body as { error?: string })?.error ?? `HTTP ${res.status}`
        )
      }
      const p = body as PreviewResponse
      setPreview(p)
      setResolutions(
        Object.fromEntries(p.fields.map((f) => [f.key, f.default_resolution]))
      )
      // Seed per-classification defaults too. 'union' is never a valid
      // classification field resolution; coerce down to 'parent' in that
      // (impossible) case so typing stays narrow.
      const seededClass: ClassificationResolutions = {}
      for (const group of p.classification_groups ?? []) {
        const fieldMap: Record<string, ClassFieldResolution> = {}
        for (const f of group.fields) {
          fieldMap[f.key] = f.default_resolution === 'child' ? 'child' : 'parent'
        }
        seededClass[String(group.subsector_id)] = fieldMap
      }
      setClassResolutions(seededClass)
      setStep('reconcile')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function performMerge() {
    if (!parentId || !childId || !preview) return
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/admin/merge-entities', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          parent_entity_id: parentId,
          child_entity_ids: [childId],
          reason: reason.trim() || undefined,
          field_resolutions: { [String(childId)]: resolutions },
          classification_resolutions: { [String(childId)]: classResolutions },
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      setSuccess(true)
      setTimeout(() => onMerged(), 650)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Merge failed')
    } finally {
      setSubmitting(false)
    }
  }

  const conflictFields = preview?.fields.filter((f) => f.conflict) ?? []
  const fillGapFields =
    preview?.fields.filter(
      (f) => !f.conflict && !f.equal && (f.parent_empty || f.child_empty)
    ) ?? []
  const unchangedFields = preview?.fields.filter((f) => f.equal) ?? []
  const classificationGroups = preview?.classification_groups ?? []
  const childOnlyClassifications = preview?.child_only_classifications ?? []
  const parentOnlyClassifications = preview?.parent_only_classifications ?? []

  const entityWrites = Object.entries(resolutions).filter(([key, choice]) => {
    const f = preview?.fields.find((x) => x.key === key)
    if (!f) return false
    if (choice === 'parent') return false
    if (choice === 'child' && f.child_empty) return false
    return true
  }).length

  const classificationWrites = classificationGroups.reduce((n, group) => {
    const byField = classResolutions[String(group.subsector_id)] ?? {}
    for (const f of group.fields) {
      const choice = byField[f.key] ?? f.default_resolution
      if (choice === 'parent') continue
      if (choice === 'child' && f.child_empty) continue
      n += 1
    }
    return n
  }, 0)

  // Deleting an overlapping child classification is always a "write" from
  // the admin's point of view, even when all field values match — the
  // duplicate row is going away so the detail page doesn't double-render.
  const classificationDeletes = classificationGroups.length

  const changedCount = entityWrites + classificationWrites

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-10 md:pt-16 px-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="px-5 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
              <span
                className={
                  step === 'pick' ? 'text-gray-900' : 'text-gray-400'
                }
              >
                1 · Pick target
              </span>
              <svg
                className="w-3 h-3 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span
                className={
                  step === 'reconcile' ? 'text-gray-900' : 'text-gray-400'
                }
              >
                2 · Resolve conflicts
              </span>
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              {step === 'pick'
                ? `Merge "${source.entity_name}" with…`
                : `Reconcile fields on "${parentName}"`}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 'pick'
                ? 'Collapses one entity under the other. Reversible.'
                : 'Pick which value wins on the parent. Unpicked fields stay as the parent\u2019s.'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 p-1 -mr-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          {step === 'pick' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Target company
                </label>
                <input
                  ref={inputRef}
                  value={picked ? picked.name : query}
                  onChange={(e) => {
                    setPicked(null)
                    setQuery(e.target.value)
                  }}
                  placeholder="Search by company name…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {!picked && matches.length > 0 && (
                  <ul className="mt-1 border border-gray-200 rounded-md divide-y divide-gray-100 max-h-56 overflow-y-auto">
                    {matches.map((m) => (
                      <li key={m.entity_id}>
                        <button
                          type="button"
                          onClick={() => {
                            setPicked(m)
                            setQuery('')
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50"
                        >
                          <div className="text-sm font-medium text-gray-800">{m.name}</div>
                          <div className="text-[11px] text-gray-500 truncate">
                            {m.sector}
                            {m.subsector ? ` · ${m.subsector}` : ''}
                            {m.canonical_website
                              ? ` · ${m.canonical_website.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
                              : ''}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!picked && query.trim().length >= 2 && matches.length === 0 && all && (
                  <p className="mt-2 text-xs text-gray-500">No matches.</p>
                )}
              </div>

              {picked && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                      Direction
                    </label>
                    <div className="space-y-1.5 text-sm">
                      <label className="flex items-start gap-2 p-2 rounded-md border border-gray-200 hover:border-blue-300 cursor-pointer">
                        <input
                          type="radio"
                          name="dir"
                          checked={direction === 'source_child'}
                          onChange={() => setDirection('source_child')}
                          className="mt-0.5"
                        />
                        <span>
                          Make <strong>{source.entity_name}</strong> a child of{' '}
                          <strong>{picked.name}</strong>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 p-2 rounded-md border border-gray-200 hover:border-blue-300 cursor-pointer">
                        <input
                          type="radio"
                          name="dir"
                          checked={direction === 'target_child'}
                          onChange={() => setDirection('target_child')}
                          className="mt-0.5"
                        />
                        <span>
                          Make <strong>{picked.name}</strong> a child of{' '}
                          <strong>{source.entity_name}</strong>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                      Reason (optional)
                    </label>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Alchemy Pay is a product line of Alchemy"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {step === 'reconcile' && preview && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <div className="flex-1">
                  <div>
                    <span className="text-gray-400">Parent: </span>
                    <strong>{preview.parent.entity_name}</strong>
                    <span className="text-gray-400"> #{preview.parent.entity_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Child: </span>
                    <strong>{preview.child.entity_name}</strong>
                    <span className="text-gray-400"> #{preview.child.entity_id}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider text-gray-400">Changes</div>
                  <div className="text-lg font-bold text-gray-900 leading-none">
                    {changedCount}
                  </div>
                </div>
              </div>

              {conflictFields.length > 0 && (
                <FieldGroup title={`Conflicts (${conflictFields.length})`} tone="amber">
                  {conflictFields.map((f) => (
                    <FieldRow
                      key={f.key}
                      field={f}
                      choice={resolutions[f.key]}
                      onChange={(c) =>
                        setResolutions((r) => ({ ...r, [f.key]: c }))
                      }
                    />
                  ))}
                </FieldGroup>
              )}

              {fillGapFields.length > 0 && (
                <FieldGroup
                  title={`Gaps the child can fill (${fillGapFields.length})`}
                  tone="blue"
                >
                  {fillGapFields.map((f) => (
                    <FieldRow
                      key={f.key}
                      field={f}
                      choice={resolutions[f.key]}
                      onChange={(c) =>
                        setResolutions((r) => ({ ...r, [f.key]: c }))
                      }
                    />
                  ))}
                </FieldGroup>
              )}

              {conflictFields.length === 0 &&
                fillGapFields.length === 0 &&
                classificationGroups.length === 0 && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                    No conflicts or gaps. The parent row will stay untouched —
                    only the child will be collapsed.
                  </div>
                )}

              {classificationGroups.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md inline-block border bg-indigo-50 border-indigo-200 text-indigo-800">
                      Shared subsectors ({classificationGroups.length})
                    </h3>
                    <span className="text-[11px] text-gray-500">
                      Duplicate child classifications will be removed.
                    </span>
                  </div>
                  {classificationGroups.map((group) => (
                    <ClassificationGroupCard
                      key={group.subsector_id}
                      group={group}
                      resolutions={classResolutions[String(group.subsector_id)] ?? {}}
                      onChange={(field, choice) =>
                        setClassResolutions((r) => ({
                          ...r,
                          [String(group.subsector_id)]: {
                            ...(r[String(group.subsector_id)] ?? {}),
                            [field]: choice,
                          },
                        }))
                      }
                    />
                  ))}
                </div>
              )}

              {(childOnlyClassifications.length > 0 ||
                parentOnlyClassifications.length > 0) && (
                <div className="rounded-lg border border-gray-100 p-3 text-[11px] text-gray-500 space-y-1.5">
                  {parentOnlyClassifications.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-700">
                        Parent-only subsectors ({parentOnlyClassifications.length}):
                      </span>{' '}
                      {parentOnlyClassifications
                        .map((c) => c.subsector_name)
                        .join(', ')}
                      <div className="text-gray-400 italic mt-0.5">
                        Kept on the parent untouched.
                      </div>
                    </div>
                  )}
                  {childOnlyClassifications.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-700">
                        Child-only subsectors ({childOnlyClassifications.length}):
                      </span>{' '}
                      {childOnlyClassifications
                        .map((c) => c.subsector_name)
                        .join(', ')}
                      <div className="text-gray-400 italic mt-0.5">
                        Preserved on the child; roll up onto the parent
                        profile automatically.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {unchangedFields.length > 0 && (
                <div className="border border-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setShowUnchanged((s) => !s)}
                    className="w-full px-3 py-2 text-left flex items-center justify-between text-xs font-semibold text-gray-500 hover:text-gray-700"
                  >
                    <span>
                      No changes ({unchangedFields.length}){' '}
                      <span className="text-gray-400 font-normal">
                        — fields that match on both sides
                      </span>
                    </span>
                    <span className="text-gray-400">
                      {showUnchanged ? '–' : '+'}
                    </span>
                  </button>
                  {showUnchanged && (
                    <ul className="px-3 pb-2 pt-1 text-[11px] text-gray-500 grid grid-cols-2 gap-x-3 gap-y-0.5">
                      {unchangedFields.map((f) => (
                        <li key={f.key} className="truncate">
                          · {f.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-2.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}
          {success && (
            <div className="p-2.5 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md">
              Merge applied. Refreshing…
            </div>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2 flex-shrink-0">
          {step === 'reconcile' ? (
            <button
              type="button"
              onClick={() => setStep('pick')}
              disabled={submitting || success}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            {step === 'pick' ? (
              <button
                type="button"
                onClick={fetchPreview}
                disabled={!picked || previewLoading}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-blue-300"
              >
                {previewLoading ? 'Loading…' : 'Next · review fields'}
              </button>
            ) : (
              <button
                type="button"
                onClick={performMerge}
                disabled={submitting || success}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-blue-300"
              >
                {submitting
                  ? 'Merging…'
                  : `Apply merge${
                      changedCount || classificationDeletes
                        ? ` (${changedCount} write${
                            changedCount === 1 ? '' : 's'
                          }${
                            classificationDeletes
                              ? ` · ${classificationDeletes} dup${
                                  classificationDeletes === 1 ? '' : 's'
                                } removed`
                              : ''
                          })`
                        : ''
                    }`}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Field rendering helpers
// -----------------------------------------------------------------------------

function FieldGroup({
  title,
  tone,
  children,
}: {
  title: string
  tone: 'amber' | 'blue'
  children: React.ReactNode
}) {
  const toneClasses =
    tone === 'amber'
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-blue-50 border-blue-200 text-blue-800'
  return (
    <div>
      <h3
        className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md inline-block mb-2 border ${toneClasses}`}
      >
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function FieldRow({
  field,
  choice,
  onChange,
}: {
  field: PreviewField
  choice: Resolution | undefined
  onChange: (c: Resolution) => void
}) {
  const effective = choice ?? field.default_resolution
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[12px] font-semibold text-gray-800">{field.label}</span>
        <span className="text-[10px] uppercase tracking-wider text-gray-400">
          {field.kind}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
        <Option
          name={`f-${field.key}`}
          checked={effective === 'parent'}
          onSelect={() => onChange('parent')}
          label="Keep parent"
          value={field.parent_value}
          kind={field.kind}
          muted={field.parent_empty}
        />
        <Option
          name={`f-${field.key}`}
          checked={effective === 'child'}
          onSelect={() => onChange('child')}
          label="Use child's"
          value={field.child_value}
          kind={field.kind}
          muted={field.child_empty}
        />
      </div>
      {field.kind === 'array' && field.union_value && field.union_value.length > 0 && (
        <div className="mt-2">
          <Option
            name={`f-${field.key}`}
            checked={effective === 'union'}
            onSelect={() => onChange('union')}
            label="Merge (union)"
            value={field.union_value}
            kind="array"
            fullWidth
          />
        </div>
      )}
    </div>
  )
}

function ClassificationGroupCard({
  group,
  resolutions,
  onChange,
}: {
  group: ClassificationGroup
  resolutions: Record<string, ClassFieldResolution>
  onChange: (field: string, choice: ClassFieldResolution) => void
}) {
  const [open, setOpen] = useState(group.conflict_count > 0)
  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-gray-50"
      >
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-gray-400">
            {group.sector_name || 'Sector'}
          </div>
          <div className="text-[13px] font-semibold text-gray-900 truncate">
            {group.subsector_name}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            {group.conflict_count > 0
              ? `${group.conflict_count} conflicting field${
                  group.conflict_count === 1 ? '' : 's'
                }`
              : 'No conflicting fields — duplicate row still cleared on merge.'}
          </div>
        </div>
        <span className="text-gray-400 text-lg leading-none mt-1">
          {open ? '–' : '+'}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-gray-100">
          {group.fields.map((f) => {
            const choice = resolutions[f.key] ?? f.default_resolution
            const narrowed: ClassFieldResolution = choice === 'child' ? 'child' : 'parent'
            return (
              <ClassificationFieldRow
                key={f.key}
                field={f}
                choice={narrowed}
                radioName={`cls-${group.subsector_id}-${f.key}`}
                onChange={(c) => onChange(f.key, c)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function ClassificationFieldRow({
  field,
  choice,
  radioName,
  onChange,
}: {
  field: PreviewField
  choice: ClassFieldResolution
  radioName: string
  onChange: (c: ClassFieldResolution) => void
}) {
  const tone = field.conflict
    ? 'border-amber-200 bg-amber-50/30'
    : field.equal
    ? 'border-gray-100 bg-gray-50/40'
    : 'border-blue-200 bg-blue-50/30'
  return (
    <div className={`border rounded-md p-2.5 ${tone}`}>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12px] font-semibold text-gray-800">
          {field.label}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-gray-400">
          {field.conflict ? 'Conflict' : field.equal ? 'Match' : field.kind}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
        <Option
          name={radioName}
          checked={choice === 'parent'}
          onSelect={() => onChange('parent')}
          label="Keep parent"
          value={field.parent_value}
          kind={field.kind}
          muted={field.parent_empty}
        />
        <Option
          name={radioName}
          checked={choice === 'child'}
          onSelect={() => onChange('child')}
          label="Use child's"
          value={field.child_value}
          kind={field.kind}
          muted={field.child_empty}
        />
      </div>
    </div>
  )
}

function Option({
  name,
  checked,
  onSelect,
  label,
  value,
  kind,
  muted,
  fullWidth,
}: {
  name: string
  checked: boolean
  onSelect: () => void
  label: string
  value: unknown
  kind: FieldKind
  muted?: boolean
  fullWidth?: boolean
}) {
  return (
    <label
      className={`flex items-start gap-2 rounded-md border p-2 cursor-pointer transition-colors ${
        checked
          ? 'border-blue-500 bg-blue-50/50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      } ${fullWidth ? 'w-full' : ''}`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
          {label}
        </div>
        <div
          className={`text-[12px] ${muted ? 'text-gray-400 italic' : 'text-gray-800'} break-words ${
            kind === 'text' ? 'line-clamp-4' : ''
          }`}
        >
          {renderValue(value, kind, muted)}
        </div>
      </div>
    </label>
  )
}

function renderValue(value: unknown, kind: FieldKind, muted?: boolean) {
  if (kind === 'bool') {
    // Never treat booleans as "empty" — false is a meaningful answer.
    return value ? 'Yes (primary)' : 'No'
  }
  if (value === null || value === undefined || value === '') {
    return muted ? '(empty)' : <span className="text-gray-400 italic">(empty)</span>
  }
  if (kind === 'array') {
    const arr = Array.isArray(value) ? value : []
    if (arr.length === 0) return <span className="text-gray-400 italic">(empty)</span>
    return (
      <div className="flex flex-wrap gap-1">
        {arr.slice(0, 12).map((v, i) => (
          <span
            key={i}
            className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px]"
          >
            {String(v)}
          </span>
        ))}
        {arr.length > 12 && (
          <span className="text-[10px] text-gray-400">+{arr.length - 12} more</span>
        )}
      </div>
    )
  }
  return String(value)
}
