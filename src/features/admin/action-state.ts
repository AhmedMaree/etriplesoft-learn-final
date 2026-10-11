export type AdminActionState = {
  // Message key under admin.errors; never raw database text.
  error?: string
  // Message key under admin.success.
  success?: string
}
