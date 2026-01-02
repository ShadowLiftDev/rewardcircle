// lib/org-server.ts

/**
 * Server-side org resolver for locked single-org mode.
 * Unlike getOrgId() (client), this one is safe to use inside API routes.
 *
 * We do NOT use NEXT_PUBLIC env vars here.
 * This ensures the org lock cannot be overridden from the client.
 */

export function getLockedOrgId(): string {
  const id = process.env.DEFAULT_ORG_ID || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;

  // Final safety fallback
  return id || "neon-lunchbox";
}