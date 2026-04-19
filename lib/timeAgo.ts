// Tiny, dependency-free relative-time formatter. Outputs strings like
// "2 weeks ago", "3 days ago", "just now". Returns null for invalid input
// so callers can skip rendering instead of showing "Invalid Date ago".
//
// Used by the entity profile + drawer "Last updated …" line (CAN-NEW-12).

export function timeAgo(input: string | number | Date | null | undefined): string | null {
  if (input == null || input === '') return null
  const when = input instanceof Date ? input : new Date(input)
  const ms = when.getTime()
  if (Number.isNaN(ms)) return null

  const diff = Date.now() - ms
  if (diff < 0 && diff > -60_000) return 'just now'
  if (diff < 45_000) return 'just now'

  const seconds = Math.round(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} ago`
  const weeks = Math.round(days / 7)
  if (weeks < 9) return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  const months = Math.round(days / 30)
  if (months < 18) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.round(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

// Format a timestamp as a long human-readable date for tooltip use.
// "April 18, 2026, 2:41 PM"
export function formatTimestamp(input: string | number | Date | null | undefined): string | null {
  if (input == null || input === '') return null
  const when = input instanceof Date ? input : new Date(input)
  const ms = when.getTime()
  if (Number.isNaN(ms)) return null
  return when.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
