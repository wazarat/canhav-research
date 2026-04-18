import { useEffect, useRef } from 'react'
import { getSupabaseBrowser } from './supabaseBrowser'

/**
 * Subscribe to postgres_changes on a set of public-schema tables and call
 * `onChange` (debounced) whenever any row is inserted/updated/deleted.
 *
 * Usage:
 *   useRealtimeTables(
 *     ['entities', 'entity_classifications', 'sectors', 'subsectors'],
 *     () => fetchCompanies(),
 *   )
 *
 * Notes:
 *   - Requires the tables to be in the `supabase_realtime` publication
 *     (see supabase/migrations/006_enable_realtime.sql).
 *   - Debounces bursts so a multi-row migration only triggers one refetch.
 *   - Fails silently if the browser client isn't configured (e.g. missing
 *     NEXT_PUBLIC_ETHDATA_SUPABASE_* env vars) — the page still works, it
 *     just won't auto-refresh.
 */
export function useRealtimeTables(
  tables: string[],
  onChange: () => void,
  options: { schema?: string; debounceMs?: number; channelName?: string } = {}
) {
  const { schema = 'public', debounceMs = 400, channelName } = options
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    if (!supabase) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const fire = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        onChangeRef.current()
      }, debounceMs)
    }

    const name = channelName ?? `rt-${schema}-${tables.join('-')}`
    const channel = supabase.channel(name)

    tables.forEach((table) => {
      channel.on(
        // `as any` needed because supabase-js's typings for postgres_changes
        // don't surface the `'*'` literal cleanly.
        'postgres_changes' as any,
        { event: '*', schema, table },
        fire
      )
    })

    channel.subscribe((status) => {
      if (process.env.NODE_ENV !== 'production') {
        if (status === 'SUBSCRIBED') {
          console.debug(`[realtime] subscribed: ${name}`)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[realtime] ${status}: ${name}`)
        }
      }
    })

    return () => {
      if (timer) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, debounceMs, channelName, tables.join('|')])
}
