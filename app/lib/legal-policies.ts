// Shared between the admin editor UI and the API routes under /api/v1/legal.
// Keep this list in sync with the four tabs on the public spotix-legal site.

export const LEGAL_POLICY_TABS = [
  { slug: "tos", label: "Terms of Service" },
  { slug: "eula", label: "End User License Agreement" },
  { slug: "refund-policy", label: "Refund Policy" },
  { slug: "privacy-policy", label: "Privacy Policy" },
] as const

export type LegalPolicySlug = (typeof LEGAL_POLICY_TABS)[number]["slug"]

export const LEGAL_EDITOR_ROLES = ["admin", "exec-assistant"] as const
