"use client";

import { useState, type FormEvent, useMemo } from "react";
import { useParams } from "next/navigation";

import { NeonSection } from "@/components/neon/NeonSection";
import { NeonCard } from "@/components/neon/NeonCard";

type RewardStoreItem = {
  id: string;
  name: string;
  description?: string;
  pointsCost: number;
  active: boolean;
  sortOrder?: number;
};

type LoadedCustomer = {
  id: string;
  name: string;
  phone?: string;
  pointsBalance: number;
  lifetimePoints: number;
  currentTier: "tier1" | "tier2" | "tier3" | "tier4";
};

export default function CustomerShopPage() {
  const { orgId } = useParams<{ orgId: string }>();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [customer, setCustomer] = useState<LoadedCustomer | null>(null);
  const [rewards, setRewards] = useState<RewardStoreItem[]>([]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orgId || !phone.trim()) return;

    setLoading(true);
    setLoadError(null);
    setCustomer(null);
    setRewards([]);

    try {
      const res = await fetch(`/api/orgs/${orgId}/loyalty/customer/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.found) {
        setLoadError(
          data?.error ||
            "We couldn’t find a wallet for that phone number. Ask staff to add points first."
        );
        return;
      }

      setCustomer(data.customer);
      setRewards(data.rewards ?? []);
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load shop.");
    } finally {
      setLoading(false);
    }
  }

  const affordableRewards = useMemo(() => {
    if (!customer) return [];
    return rewards.filter((r) => customer.pointsBalance >= r.pointsCost);
  }, [customer, rewards]);

  return (
    <NeonSection>
      {/* ---------- HEADER ---------- */}
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.25em] text-purple-300/80">
          NeonHQ · RewardCircle
        </p>
        <h1 className="text-2xl font-semibold">RewardCircle Shop</h1>
        <p className="text-sm text-slate-300/80">
          Browse everything you can unlock. Redeem at the counter.
        </p>
      </div>

      {/* ---------- PHONE INPUT ---------- */}
      <NeonCard>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs text-slate-300">
              Phone Number
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-indigo-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-indigo-400 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Load My Shop"}
          </button>
        </form>

        {loadError && (
          <p className="mt-3 text-xs text-red-300">{loadError}</p>
        )}
      </NeonCard>

      {/* ---------- CUSTOMER SNAPSHOT ---------- */}
      {customer && (
        <NeonCard>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Hey, {customer.name}</h2>
              <p className="text-sm text-slate-300/80">
                You have{" "}
                <span className="font-semibold">{customer.pointsBalance} pts</span>
              </p>
            </div>

            <div className="text-right text-xs text-slate-400">
              Tier:{" "}
              <span className="font-semibold text-indigo-300">
                {customer.currentTier.toUpperCase()}
              </span>
              <div className="text-[11px] text-slate-500">
                Lifetime: {customer.lifetimePoints}
              </div>
            </div>
          </div>

          {affordableRewards.length > 0 && (
            <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              You can redeem{" "}
              <span className="font-semibold">{affordableRewards.length}</span>{" "}
              reward{affordableRewards.length > 1 ? "s" : ""} now ✨
            </div>
          )}
        </NeonCard>
      )}

      {/* ---------- REWARD GRID ---------- */}
      <NeonCard>
        <h2 className="text-lg font-semibold">Available Rewards</h2>
        <p className="text-sm text-slate-300/80">
          Show this screen to staff and they’ll redeem it for you.
        </p>

        {!customer && (
          <p className="mt-4 text-sm text-slate-400">
            Enter your phone to view rewards.
          </p>
        )}

        {customer && rewards.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">No rewards yet.</p>
        )}

        {customer && rewards.length > 0 && (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((reward) => {
              const canAfford = customer.pointsBalance >= reward.pointsCost;

              return (
                <li
                  key={reward.id}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-4"
                >
                  <div className="font-semibold text-slate-50">
                    {reward.name}
                  </div>
                  {reward.description && (
                    <p className="mt-1 text-xs text-slate-400">
                      {reward.description}
                    </p>
                  )}

                  <div className="mt-3 flex justify-between items-center text-sm">
                    <div>
                      Cost: <b>{reward.pointsCost} pts</b>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        canAfford
                          ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {canAfford ? "Redeemable" : "Keep earning"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </NeonCard>
    </NeonSection>
  );
}