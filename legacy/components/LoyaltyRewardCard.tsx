"use client";

import * as React from "react";

export type LoyaltyReward = {
  id: string;
  name: string;
  description?: string;
  pointsCost: number;
  active: boolean;
  sortOrder?: number | null;
};

type LoyaltyRewardCardProps = {
  reward: LoyaltyReward;
  /**
   * Called when the primary button is clicked.
   * Example: Redeem, Select, Edit, etc.
   */
  onPrimaryAction?: (reward: LoyaltyReward) => void;
  primaryLabel?: string;

  /**
   * Optional secondary action (e.g. Archive / Unarchive).
   */
  onSecondaryAction?: (reward: LoyaltyReward) => void;
  secondaryLabel?: string;

  /**
   * Disable the primary button (e.g. not enough points, busy, no customer loaded).
   */
  primaryDisabled?: boolean;

  /**
   * Extra className for custom layout usage.
   */
  className?: string;
};

export function LoyaltyRewardCard({
  reward,
  onPrimaryAction,
  primaryLabel = "Select",
  onSecondaryAction,
  secondaryLabel,
  primaryDisabled,
  className,
}: LoyaltyRewardCardProps) {
  const statusClasses = reward.active
    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
    : "bg-slate-700/40 text-slate-300 border-slate-600";

  return (
    <div
      className={[
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/80 p-4",
        className || "",
      ].join(" ")}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-50">
            {reward.name}
          </h3>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClasses}`}>
            {reward.active ? "Active" : "Archived"}
          </span>
        </div>
        {reward.description && (
          <p className="text-xs text-slate-400">{reward.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm text-slate-200">
          Cost:{" "}
          <span className="font-semibold">{reward.pointsCost} pts</span>
        </div>

        <div className="flex items-center gap-2">
          {onSecondaryAction && secondaryLabel && (
            <button
              type="button"
              onClick={() => onSecondaryAction(reward)}
              className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-300 transition hover:bg-slate-100 hover:text-black"
            >
              {secondaryLabel}
            </button>
          )}

          {onPrimaryAction && (
            <button
              type="button"
              onClick={() => onPrimaryAction(reward)}
              disabled={primaryDisabled}
              className="rounded-md border border-slate-500 px-3 py-1.5 text-xs font-semibold text-slate-50 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {primaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoyaltyRewardCard;