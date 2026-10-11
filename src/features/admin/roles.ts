// Roles an administrator may grant or revoke. `instructor` is a label only: attribution grants no
// additional permission, and separate authoring rights are not approved (Phase 06, decision D11).
export const grantableRoles = ['admin', 'instructor'] as const
export type GrantableRole = (typeof grantableRoles)[number]

export const ADMIN_PAGE_SIZE = 25
