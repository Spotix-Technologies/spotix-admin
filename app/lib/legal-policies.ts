// Document types (tos, eula, ...) used to be a hardcoded union here. They
// now live in the legal_policy_types table so admins can add new ones from
// the Legal Content editor — see /api/v1/legal/types. This file just keeps
// the small bits that are still genuinely fixed.

export const LEGAL_EDITOR_ROLES = ["admin", "exec-assistant"] as const

export interface LegalPolicyType {
  slug: string
  label: string
  sort_order: number
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function isValidSlugFormat(slug: string): boolean {
  return SLUG_PATTERN.test(slug)
}

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
