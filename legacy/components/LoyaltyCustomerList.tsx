"use client";

import * as React from "react";
import Link from "next/link";

export type LoyaltyCustomerListItem = {
  id: string;
  name: string;
  phone?: string;
  pointsBalance: number;
  lifetimePoints: number;
  currentTier: string;
};

export type LoyaltyCustomerListProps = {
  customers: LoyaltyCustomerListItem[];
  loading?: boolean;
  error?: string | null;
  /**
   * Optional base href for "View details" links.
   * Example: `/orgs/neon-lunchbox/loyalty/admin/customers`
   * Will render as `${detailsHrefBase}/${customer.id}`
   */
  detailsHrefBase?: string;
  /**
   * Optional row click handler if you prefer client-side selection
   * instead of links.
   */
  onRowClick?: (customerId: string) => void;
  className?: string;
};

export function LoyaltyCustomerList({
  customers,
  loading,
  error,
  detailsHrefBase,
  onRowClick,
  className,
}: LoyaltyCustomerListProps) {
  const countLabel = loading
    ? "Loading customers…"
    : `Showing ${customers.length} customer${
        customers.length === 1 ? "" : "s"
      }`;

  return (
    <div className={className ?? "space-y-2"}>
      {/* Error */}
      {error && (
        <div className="mb-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Count / caption */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{countLabel}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-900/80 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Phone</th>
              <th className="px-3 py-2 text-left font-medium">Balance</th>
              <th className="px-3 py-2 text-left font-medium">Lifetime</th>
              <th className="px-3 py-2 text-left font-medium">Tier</th>
              <th className="px-3 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const row = (
                <tr
                  key={c.id}
                  className={`border-t border-slate-800/80 ${
                    onRowClick ? "cursor-pointer hover:bg-slate-900/60" : ""
                  }`}
                  onClick={
                    onRowClick ? () => onRowClick(c.id) : undefined
                  }
                >
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2">{c.phone || "—"}</td>
                  <td className="px-3 py-2">{c.pointsBalance}</td>
                  <td className="px-3 py-2">{c.lifetimePoints}</td>
                  <td className="px-3 py-2 uppercase">
                    {c.currentTier}
                  </td>
                  <td className="px-3 py-2">
                    {detailsHrefBase ? (
                      <Link
                        href={`${detailsHrefBase}/${c.id}`}
                        className="text-xs text-cyan-400 hover:text-cyan-300"
                        onClick={(e) => {
                          // if we also have onRowClick, don't trigger row click
                          if (onRowClick) {
                            e.stopPropagation();
                          }
                        }}
                      >
                        View details →
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              );

              return row;
            })}

            {!loading && customers.length === 0 && !error && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-4 text-center text-xs text-slate-400"
                >
                  No customers found yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LoyaltyCustomerList;