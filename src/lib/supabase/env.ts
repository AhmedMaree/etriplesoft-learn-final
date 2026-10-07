export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const missing: string[] = []

  if (!url || !publishableKey) {
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!publishableKey) missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
    throw new Error(
      `Missing Supabase environment variables: ${missing.join(', ')}. Configure them in .env.local or the deployment environment.`,
    )
  }

  return { url, publishableKey }
}
