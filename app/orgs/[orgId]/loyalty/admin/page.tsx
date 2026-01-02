"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOrgId } from "@/lib/org";  // NEW: import org resolver
import { LoyaltyAdminTabs } from "@/components/loyalty/LoyaltyAdminTabs";

type DashboardSummary = {
  totalCustomers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
};

type Transaction = {
  id: string;
  customerId: string;
  customerName: string;
  rewardId?: string | null;
  type: "earn" | "redeem";
  points: number;
  purchaseAmount?: number | null;
  staffId?: string | null;
  createdAt?: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
  phone?: string;
  pointsBalance: number;
  lifetimePoints: number;
  currentTier: string;
};

export default function LoyaltyAdminDashboardPage() {
  // 🔥 Use env variable instead of URL params
  const orgId = getOrgId();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(
          `/api/orgs/${orgId}/loyalty/admin/overview`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data?.error ||
              `Failed to load dashboard (HTTP ${res.status})`
          );
        }

        const data = (await res.json()) as {
          summary: DashboardSummary;
          recent: Transaction[];
          customers: CustomerRow[];
        };

        if (!alive) return;

        setSummary(data.summary);
        setRecent(data.recent);
        setCustomers(data.customers);
      } catch (e: any) {
        console.error("[loyalty admin dashboard] error:", e);
        if (!alive) return;
        setErr(e?.message || "Failed to load dashboard data.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [orgId]); // orgId is stable since it comes from env


  // ----------------------------------------------------------------------
  // LOADING & ERROR STATES
  // ----------------------------------------------------------------------

  if (loading && !summary && !customers.length) {
    return (
      <section className="space-y-4">
        <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-400/80">
          NeonHQ · RewardCircle
        </p>
        <h1 className="text-2xl font-semibold text-slate-50">
          Loyalty Dashboard
        </h1>
        <p className="text-sm text-slate-400">Loading data…</p>
      </section>
    );
  }

  if (err) {
    return (
      <section className="space-y-4">
        <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-400/80">
          NeonHQ · RewardCircle
        </p>
        <h1 className="text-2xl font-semibold text-slate-50">
          Loyalty Dashboard
        </h1>
        <p className="text-sm text-red-300">{err}</p>
      </section>
    );
  }


  // ----------------------------------------------------------------------
  // MAIN RENDER
  // ----------------------------------------------------------------------

  return (
    <section className="space-y-8">
      {/* Header + tabs */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-400/80">
              NeonHQ · RewardCircle
            </p>
            <h1 className="text-2xl font-semibold text-slate-50">
              Loyalty Dashboard
            </h1>
            <p className="text-sm text-slate-400">
              Overview of your customers, points, and recent activity.
            </p>
          </div>

          <Link
            href={`/orgs/${orgId}/loyalty/admin/settings`}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-xs hover:bg-white hover:text-black"
          >
            Program Settings
          </Link>
        </div>

        {/* Admin nav tabs */}
        <LoyaltyAdminTabs />
      </header>

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
            <div className="mb-1 text-xs text-slate-400">Total Customers</div>
            <div className="text-2xl font-semibold text-slate-50">
              {summary.totalCustomers}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
            <div className="mb-1 text-xs text-slate-400">
              Total Points Issued
            </div>
            <div className="text-2xl font-semibold text-slate-50">
              {summary.totalPointsIssued}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
            <div className="mb-1 text-xs text-slate-400">
              Total Points Redeemed
            </div>
            <div className="text-2xl font-semibold text-slate-50">
              {summary.totalPointsRedeemed}
            </div>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">Recent Activity</h2>

        {recent.length === 0 ? (
          <p className="text-sm text-slate-400">No loyalty activity recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/80 text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-left font-medium">Points</th>
                  <th className="px-3 py-2 text-left font-medium">Customer</th>
                  <th className="px-3 py-2 text-left font-medium">Staff</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((tx) => (
                  <tr key={tx.id} className="border-t border-slate-800/80">
                    <td className="px-3 py-2">
                      {tx.createdAt
                        ? new Date(tx.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2 capitalize">
                      {tx.type === "earn" ? "Earned" : "Redeemed"}
                    </td>
                    <td className="px-3 py-2">{tx.points} pts</td>
                    <td className="px-3 py-2">{tx.customerName}</td>
                    <td className="px-3 py-2">{tx.staffId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent customers snippet */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-100">Customers</h2>

          <Link
            href={`/orgs/${orgId}/loyalty/admin/customers`}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            View all →
          </Link>
        </div>

        {customers.length === 0 ? (
          <p className="text-sm text-slate-400">No customers have been added yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/80 text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Phone</th>
                  <th className="px-3 py-2 text-left font-medium">Balance</th>
                  <th className="px-3 py-2 text-left font-medium">Lifetime Points</th>
                  <th className="px-3 py-2 text-left font-medium">Tier</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-t border-slate-800/80">
                    <td className="px-3 py-2">
                      <Link
                        href={`/orgs/${orgId}/loyalty/admin/customers/${c.id}`}
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        {c.name}
                      </Link>
                    </td>

                    <td className="px-3 py-2">{c.phone || "—"}</td>
                    <td className="px-3 py-2">{c.pointsBalance}</td>
                    <td className="px-3 py-2">{c.lifetimePoints}</td>
                    <td className="px-3 py-2 uppercase">{c.currentTier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}