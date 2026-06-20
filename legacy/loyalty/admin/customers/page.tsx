"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { NeonSection } from "@/components/neon/NeonSection";
import { NeonCard } from "@/components/neon/NeonCard";

type CustomerRow = {
  id: string;
  name: string;
  phone?: string;
  pointsBalance: number;
  lifetimePoints: number;
  currentTier: string;
};

export default function AdminCustomersPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/orgs/${orgId}/loyalty/admin/customers`, {
          cache: "no-store",
        });

        const data = await res.json();
        if (!alive) return;

        if (!res.ok) throw new Error(data?.error || "Failed to load customers.");

        setCustomers(data.customers ?? []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load customers.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [orgId]);

  return (
    <NeonSection>
      {/* HEADER */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-cyan-300/80">
          NeonHQ · RewardCircle
        </p>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-slate-300/80">
          Search, view, and manage your loyalty customers.
        </p>
      </div>

      {error && (
        <NeonCard className="border-red-500/40">
          <p className="text-red-300">{error}</p>
        </NeonCard>
      )}

      {/* CUSTOMER TABLE */}
      <NeonCard>
        {loading ? (
          <p className="text-sm text-slate-400">Loading customers…</p>
        ) : customers.length === 0 ? (
          <p className="text-sm text-slate-400">No customers found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800/70">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/60 text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Phone</th>
                  <th className="px-3 py-2 text-left">Tier</th>
                  <th className="px-3 py-2 text-left">Balance</th>
                  <th className="px-3 py-2 text-left">Lifetime</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-slate-800/50 hover:bg-slate-900/40 transition cursor-pointer"
                    onClick={() =>
                      router.push(`/orgs/${orgId}/loyalty/admin/customers/${c.id}`)
                    }
                  >
                    <td className="px-3 py-2">{c.name}</td>
                    <td className="px-3 py-2">{c.phone ?? "—"}</td>
                    <td className="px-3 py-2 uppercase">{c.currentTier}</td>
                    <td className="px-3 py-2">{c.pointsBalance}</td>
                    <td className="px-3 py-2">{c.lifetimePoints}</td>
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