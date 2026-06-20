"use client";

import * as React from "react";

export type LoyaltyCustomerDetailProps = {
  customer: {
    id: string;
    name: string;
    phone?: string;
    pointsBalance: number;
    lifetimePoints: number;
    currentTier: string;
    streakCount: number;
    lastVisitDate?: string;
  } | null;
  transactions: {
    id: string;
    type: "earn" | "redeem" | "adjust";
    points: number;
    rewardId?: string | null;
    purchaseAmount?: number | null;
    staffId?: string | null;
    createdAt?: string;
  }[];
  /**
   * Optional flag if parent is still loading data.
   * Component will show a simple loading state.
   */
  loading?: boolean;
  /**
   * Optional error message from parent, if any.
   */
  error?: string | null;
  /**
   * Optional extra className wrapper
   */
  className?: string;
};

export function LoyaltyCustomerDetail({
  customer,
  transactions,
  loading,
  error,
  className,
}: LoyaltyCustomerDetailProps) {
  return (
    <section className={className ?? "space-y-6"}>
      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <p className="text-sm text-slate-400">Loading customer…</p>
      )}

      {/* Main summary */}
      {customer && !loading && !error && (
        <>
          <div className="grid gap-4 md:grid-cols-[1.1fr_minmax(0,1fr)]">
            {/* Summary card */}
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    {customer.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    Tier:{" "}
                    <span className="font-semibold uppercase">
                      {customer.currentTier}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Phone:{" "}
                    <span className="font-mono">
                      {customer.phone || "No phone on file"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase text-slate-400">
                    Balance
                  </div>
                  <div className="text-2xl font-bold text-cyan-300">
                    {customer.pointsBalance} pts
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="space-y-0.5">
                  <div className="text-slate-400">Lifetime points</div>
                  <div className="font-semibold">
                    {customer.lifetimePoints}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-slate-400">Streak</div>
                  <div className="font-semibold">
                    {customer.streakCount} day
                    {customer.streakCount === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-slate-400">Last visit</div>
                  <div className="font-semibold">
                    {customer.lastVisitDate || "Unknown"}
                  </div>
                </div>
              </div>
            </div>

            {/* Manual adjust placeholder */}
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="text-sm font-semibold text-slate-100">
                Manual Adjustments
              </div>
              <p className="text-xs text-slate-400">
                In a future update, you can grant or remove points here (e.g.
                service recovery, promotions). For now, use staff screens to
                earn/redeem points.
              </p>
            </div>
          </div>

          {/* Transactions */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Recent Activity
            </h2>
            {transactions.length === 0 ? (
              <p className="text-xs text-slate-400">
                No loyalty activity recorded for this customer yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-900/80 text-slate-300">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">
                        Date
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Type
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Points
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Purchase
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Reward
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Staff
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-t border-slate-800/80"
                      >
                        <td className="px-3 py-2">
                          {tx.createdAt
                            ? new Date(tx.createdAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-3 py-2 capitalize">{tx.type}</td>
                        <td className="px-3 py-2">{tx.points} pts</td>
                        <td className="px-3 py-2">
                          {typeof tx.purchaseAmount === "number"
                            ? `$${tx.purchaseAmount.toFixed(2)}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {tx.rewardId || "—"}
                        </td>
                        <td className="px-3 py-2">
                          {tx.staffId || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* No customer state (only if not loading & no error) */}
      {!loading && !error && !customer && (
        <p className="text-sm text-slate-400">
          No customer loaded. Select a customer from the list.
        </p>
      )}
    </section>
  );
}

export default LoyaltyCustomerDetail;