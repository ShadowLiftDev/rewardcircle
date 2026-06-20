"use client";

import * as React from "react";
import type { LoyaltyReward } from "./LoyaltyRewardCard";

type LoyaltyRewardsTableProps = {
  rewards: LoyaltyReward[];
  loading?: boolean;
  /**
   * Edit handler – if provided, "Edit" shows in the Actions column.
   */
  onEdit?: (reward: LoyaltyReward) => void;
  /**
   * Archive/unarchive handler – if provided, toggle action shows in the Actions column.
   */
  onToggleActive?: (reward: LoyaltyReward) => void;
  /**
   * Optional override for empty state text.
   */
  emptyMessage?: string;
};

export function LoyaltyRewardsTable({
  rewards,
  loading,
  onEdit,
  onToggleActive,
  emptyMessage = "No rewards configured yet. Click “New reward” to get started.",
}: LoyaltyRewardsTableProps) {
  const hasActions = Boolean(onEdit || onToggleActive);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-900/80 text-slate-300">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">Cost (pts)</th>
            <th className="px-3 py-2 text-left font-medium">Sort</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            {hasActions && (
              <th className="px-3 py-2 text-left font-medium">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={hasActions ? 5 : 4}
                className="px-3 py-4 text-center text-xs text-slate-400"
              >
                Loading rewards…
              </td>
            </tr>
          ) : rewards.length === 0 ? (
            <tr>
              <td
                colSpan={hasActions ? 5 : 4}
                className="px-3 py-4 text-center text-xs text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rewards.map((r) => (
              <tr key={r.id} className="border-t border-slate-800/80">
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-100">{r.name}</div>
                  {r.description && (
                    <div className="text-[11px] text-slate-400">
                      {r.description}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">{r.pointsCost}</td>
                <td className="px-3 py-2">{r.sortOrder ?? "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      r.active
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                        : "bg-slate-700/40 text-slate-300 border border-slate-600"
                    }`}
                  >
                    {r.active ? "Active" : "Archived"}
                  </span>
                </td>
                {hasActions && (
                  <td className="px-3 py-2 space-x-2">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(r)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300"
                      >
                        Edit
                      </button>
                    )}
                    {onToggleActive && (
                      <button
                        type="button"
                        onClick={() => onToggleActive(r)}
                        className="text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        {r.active ? "Archive" : "Unarchive"}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default LoyaltyRewardsTable;