"use client";

import * as React from "react";

type Props = {
  tier: "tier1" | "tier2" | "tier3" | "tier4";
  label?: string; // Optional resolved display label
  className?: string;
};

/**
 * A small reusable badge that displays the customer's loyalty tier.
 * Falls back to generic Tier 1 / Tier 2 / etc if no custom label is provided.
 */
export function LoyaltyPlanBadge({ tier, label, className }: Props) {
  // Neon color mapping per tier
  const colors: Record<Props["tier"], string> = {
    tier1: "bg-slate-800 text-slate-200 border-slate-600",
    tier2: "bg-cyan-900/40 text-cyan-300 border-cyan-500/40",
    tier3: "bg-violet-900/40 text-violet-300 border-violet-500/40",
    tier4: "bg-amber-900/40 text-amber-300 border-amber-500/40",
  };

  const defaultLabel = {
    tier1: "Tier 1",
    tier2: "Tier 2",
    tier3: "Tier 3",
    tier4: "Tier 4",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        colors[tier],
        className || "",
      ].join(" ")}
    >
      {label ?? defaultLabel[tier]}
    </span>
  );
}

export default LoyaltyPlanBadge;