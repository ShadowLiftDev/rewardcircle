"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { NeonSection } from "@/components/neon/NeonSection";
import { NeonCard } from "@/components/neon/NeonCard";

type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  pointsBalance: number;
  lifetimePoints: number;
  currentTier: string;
};

type Transaction = {
  id: string;
  type: "earn" | "redeem";
  points: number;
  createdAt?: string | null;
  rewardName?: string | null;
};

export default function CustomerDetailPage() {
  const { orgId, customerId } = useParams<{
    orgId: string;
    customerId: string;
  }>();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tx, setTx] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !customerId) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/orgs/${orgId}/loyalty/admin/customers/${customerId}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!alive) return;

        if (!res.ok) throw new Error(data?.error || "Failed to load customer.");

        setCustomer(data.customer);
        setTx(data.transactions ?? []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load customer.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [orgId, customerId]);

  return (
    <NeonSection>
      {/* HEADER */}
      {customer && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-cyan-300/80">
            NeonHQ · RewardCircle
          </p>
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <p className="text-sm text-slate-300/80">
            {customer.phone ?? "—"} · Tier:{" "}
            <span className="text-cyan-300">{customer.currentTier}</span>
          </p>
        </div>
      )}

      {error && (
        <NeonCard className="border-red-500/40">
          <p className="text-red-300">{error}</p>
        </NeonCard>
      )}

      {/* SUMMARY CARDS */}
      {customer && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NeonCard>
            <div className="text-xs text-slate-400">Points Balance</div>
            <div className="mt-1 text-3xl font-bold text-cyan-300">
              {customer.pointsBalance}
            </div>
          </NeonCard>

          <NeonCard>
            <div className="text-xs text-slate-400">Lifetime Points</div>
            <div className="mt-1 text-3xl font-bold text-emerald-300">
              {customer.lifetimePoints}
            </div>
          </NeonCard>

          <NeonCard>
            <div className="text-xs text-slate-400">Tier</div>
            <div className="mt-1 text-2xl font-bold text-purple-300 uppercase">
              {customer.currentTier}
            </div>
          </NeonCard>
        </div>
      )}

      {/* TRANSACTIONS */}
      <NeonCard>
        <h2 className="text-lg font-semibold text-slate-50">
          Recent Activity
        </h2>
        <p className="text-xs text-slate-400 mb-3">Last 20 transactions</p>

        {tx.length === 0 ? (
          <p className="text-sm text-slate-400">No recorded transactions.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800/70">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/60 text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Points</th>
                  <th className="px-3 py-2 text-left">Reward</th>
                  <th className="px-3 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {tx.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-slate-800/50 hover:bg-slate-900/40 transition"
                  >
                    <td className="px-3 py-2 capitalize">{t.type}</td>
                    <td className="px-3 py-2">{t.points}</td>
                    <td className="px-3 py-2">{t.rewardName ?? "—"}</td>
                    <td className="px-3 py-2">
                      {t.createdAt
                        ? new Date(t.createdAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </NeonCard>
    </NeonSection>
  );
}