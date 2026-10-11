// Supabase answers an exhausted email quota (hosted built-in sender) or request budget with
// HTTP 429 and one of these codes. The UI shows a clear message and a cooldown instead of
// the generic failure.
export const RATE_LIMIT_COOLDOWN_SECONDS = 60

const RATE_LIMIT_CODES = new Set(['over_email_send_rate_limit', 'over_request_rate_limit', 'over_sms_send_rate_limit'])

export function isRateLimitError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const { status, code } = error as { status?: unknown; code?: unknown }
  return status === 429 || (typeof code === 'string' && RATE_LIMIT_CODES.has(code))
}
