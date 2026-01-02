"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoyaltyStaffTabs } from "@/components/loyalty/LoyaltyStaffTabs";

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
};

type LookupResponse = {
  found: boolean;
  error?: string;
  customer?: {
    id: string;
    name: string;
    phone?: string;
    pointsBalance: number;
    lifetimePoints: number;
    currentTier: "tier1" | "tier2" | "tier3" | "tier4";
    streakCount: number;
  };
  program?: any;
  rewards?: RewardStoreItem[];
};

type RedeemResponse = {
  ok: boolean;
  role: "owner" | "staff" | "customer";
  customerId: string;
  rewardId: string;
  newBalance: number;
  costPoints: number;
  rewardName: string;
  error?: string;
};

export default function StaffRedeemPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<LoadedCustomer | null>(null);

  const [rewards, setRewards] = useState<RewardStoreItem[]>([]);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const goTo = (slug: string) => {
    if (!orgId) return;
    router.push(`/orgs/${orgId}/loyalty/staff/${slug}`);
  };

  async function loadCustomer() {
    if (!orgId || !phone.trim()) return;
    setErr(null);
    setMsg(null);
    setCustomer(null);
    setRewards([]);
    setLoading(true);
    setLoadingRewards(true);

    try {
      const res = await fetch(
        `/api/orgs/${String(orgId)}/loyalty/customer/lookup`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ phone: phone.trim() }),
        },
      );

      const data = (await res.json().catch(() => ({}))) as LookupResponse;

      if (!res.ok || data.found === false) {
        throw new Error(
          data.error ||
            "We couldn’t find a wallet for that phone number. Add points first.",
        );
      }

      if (!data.customer) {
        throw new Error("Lookup did not return a customer record.");
      }

      setCustomer({
        id: data.customer.id,
        name: data.customer.name,
        phone: data.customer.phone,
        pointsBalance: data.customer.pointsBalance,
      });

      setRewards(data.rewards || []);
      if (!data.rewards || data.rewards.length === 0) {
        setMsg("No rewards are configured yet.");
      }
    } catch (e: any) {
      console.error("[staffRedeem] load customer error:", e);
      setErr(e?.message || "Failed to load customer.");
    } finally {
      setLoading(false);
      setLoadingRewards(false);
    }
  }

  async function redeemReward(item: RewardStoreItem) {
    if (!orgId || !customer) return;
    if (redeemingId) return;

    const canAfford = customer.pointsBalance >= item.pointsCost;
    if (!canAfford) {
      setErr("Customer does not have enough points for this reward.");
      return;
    }

    setErr(null);
    setMsg(null);
    setRedeemingId(item.id);

    try {
      const res = await fetch(
        `/api/orgs/${String(orgId)}/loyalty/redeem`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            customerId: customer.id,
            rewardId: item.id,
          }),
        },
      );

      const data = (await res.json().catch(() => ({}))) as RedeemResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Redeem failed (HTTP ${res.status})`);
      }

      setMsg(
        `Redeemed "${item.name}" for ${item.pointsCost} pts. New balance: ${data.newBalance}.`,
      );

      // update local customer balance
      setCustomer((prev) =>
        prev
          ? {
              ...prev,
              pointsBalance: data.newBalance,
            }
          : prev,
      );
    } catch (e: any) {
      console.error("[staffRedeem] redeem error:", e);
      setErr(e?.message || "Could not redeem this reward.");
    } finally {
      setRedeemingId(null);
    }
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-400/80">
          NeonHQ · RewardCircle
        </p>
        <h1 className="text-2xl font-semibold text-slate-50">
          Redeem Rewards
        </h1>
      </div>

      <LoyaltyStaffTabs />

      {/* Optional quick toggle button */}
      <div className="flex justify-end">
        <button
          onClick={() => goTo("earn")}
          className="rounded-md border border-slate-500 px-3 py-1.5 text-xs transition hover:bg-white hover:text-black"
        >
          Go to Add Points
        </button>
      </div>

      {/* Step 1: Find customer by phone */}
      <div className="max-w-md space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <p className="text-sm text-slate-300/80">
          Enter the customer&apos;s phone number to load their wallet. Then
          choose a reward to redeem.
        </p>

        <div>
          <label
            htmlFor="phone"
            className="mb-1 block text-xs font-medium text-slate-300"
          >
            Customer Phone
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            placeholder="e.g. 555-123-4567"
          />
        </div>

        <button
          type="button"
          onClick={loadCustomer}
          disabled={loading || !phone.trim()}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading..." : "Load Wallet"}
        </button>

        {err && <p className="text-xs text-red-300/90">{err}</p>}
        {msg && !err && (
          <p className="text-xs text-emerald-300/90">{msg}</p>
        )}

        {customer && (
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm">
            <div className="font-medium text-slate-50">{customer.name}</div>
            <div className="text-xs text-slate-400">
              Phone: {customer.phone || phone}
            </div>
            <div className="mt-1 text-xs text-slate-200">
              Points balance:{" "}
              <span className="font-semibold">{customer.pointsBalance}</span>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Reward store for staff */}
      <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/80 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-50">Reward Store</h2>
        <p className="mt-1 text-sm text-slate-300/80">
          Select a reward to redeem for this customer. Their points will be
          deducted automatically.
        </p>

        {loadingRewards ? (
          <p className="mt-4 text-sm text-slate-400">Loading rewards…</p>
        ) : rewards.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            No rewards are configured yet.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {rewards.map((reward) => {
              const canAfford =
                customer && customer.pointsBalance >= reward.pointsCost;
              const isBusy = redeemingId === reward.id;

              return (
                <li
                  key={reward.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/80 p-4"
                >
                  <div>
                    <div className="font-medium text-slate-50">
                      {reward.name}
                    </div>
                    {reward.description && (
                      <div className="mt-1 text-xs text-slate-400">
                        {reward.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-slate-200">
                      Cost:{" "}
                      <span className="font-semibold">
                        {reward.pointsCost} pts
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => redeemReward(reward)}
                      disabled={!customer || !canAfford || isBusy}
                      className="rounded-lg border border-slate-500 px-3 py-2 text-sm text-slate-50 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isBusy
                        ? "Redeeming…"
                        : !customer
                        ? "Load Wallet"
                        : canAfford
                        ? "Redeem"
                        : "Not enough points"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}