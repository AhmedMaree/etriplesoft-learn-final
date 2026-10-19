// IANA time zones offered in settings, and the server-side check for a submitted zone.

const FALLBACK_TIME_ZONES = ['UTC', 'Africa/Cairo', 'Asia/Riyadh', 'Asia/Dubai', 'Europe/London', 'Asia/Karachi']

let cached: string[] | null = null

export function listTimeZones(): string[] {
  if (cached) return cached
  let zones: string[] = []
  try {
    zones = Intl.supportedValuesOf('timeZone')
  } catch {
    zones = []
  }
  cached = Array.from(new Set(['UTC', ...(zones.length ? zones : FALLBACK_TIME_ZONES)]))
  return cached
}

// Browser and server ICU builds can list slightly different zones, so validation accepts any
// well-formed identifier the server runtime can format with rather than exact list membership.
export function isSupportedTimeZone(value: string): boolean {
  if (value.length > 64 || !/^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z0-9_+-]+){0,2}$/.test(value)) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}
