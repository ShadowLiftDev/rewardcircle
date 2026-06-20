
export function getLockedOrgId(): string {
  const id = process.env.DEFAULT_ORG_ID || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;

  // Final safety fallback
  return id || "neon-lunchbox";
}