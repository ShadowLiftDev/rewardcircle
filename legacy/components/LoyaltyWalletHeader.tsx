"use client";

import * as React from "react";
import { LoyaltyPlanBadge } from "@/components/loyalty/LoyaltyPlanBadge";

type LoyaltyWalletHeaderProps = {
  name: string;
  phone?: string;

  pointsBalance: number;
  lifetimePoints?: number;

  tier: "tier1" | "tier2" | "tier3" | "tier4";
  tierLabel?: string; // optional resolved label from program settings

  streakCount?: number;
  lastVisitDate?: string;
};

export function LoyaltyWalletHeader({
  name,
  phone,
  pointsBalance,
  lifetimePoints,
  tier,
  tierLabel,
  streakCount,
  lastVisitDate,
}: LoyaltyWalletHeaderProps) {
  const formattedLastVisit = React.useMemo(() => {
    if (!lastVisitDate) return null;
    const d = new Date(lastVisitDate);
    return isNaN(d.getTime()) ? lastVisitDate : d.toLocaleDateString();
  }, [lastVisitDate]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* LEFT SIDE */}
        <div className="space-y-2">
          {/* Name + Tier Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-50 sm:text-xl">
              {name}
            </h1>

            {/* FIXED → pass tier + optional label */}
            <LoyaltyPlanBadge tier={tier} label={tierLabel} />
          </div>

          {/* Phone */}
          {phone && (
            <p className="text-xs text-slate-400">
              Phone:{" "}
              <span className="font-mono text-slate-200">{phone}</span>
            </p>
          )}

          {/* Lifetime, streak, last visit */}
          <div className="flex flex-wrap gap-4 text-xs text-slate-300">
            {typeof lifetimePoints === "number" && (
              <div className="space-y-0.5">
                <div className="text-slate-400">Lifetime Points</div>
                <div className="font-semibold">{lifetimePoints}</div>
              </div>
            )}

            {typeof streakCount === "number" && (
              <div className="space-y-0.5">
                <div className="text-slate-400">Visit Streak</div>
                <div className="font-semibold">
                  {streakCount} day{streakCount === 1 ? "" : "s"}
                </div>
              </div>
            )}

            {formattedLastVisit && (
              <div className="space-y-0.5">
                <div className="text-slate-400">Last Visit</div>
                <div className="font-semibold">{formattedLastVisit}</div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE → Points Balance Box */}
        <div className="flex items-center justify-start sm:justify-end">
          <div className="rounded-xl border border-cyan-500/40 bg-slate-950/70 px-4 py-3 text-right shadow-[0_0_25px_rgba(34,211,238,0.15)]">
            <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-300/80">
              Points Balance
            </div>
            <div className="text-2xl font-bold text-cyan-300 sm:text-3xl">
              {pointsBalance.toLocaleString()}{" "}
              <span className="text-sm font-semibold text-cyan-300/80">
                pts
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LoyaltyWalletHeader;