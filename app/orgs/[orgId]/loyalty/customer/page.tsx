"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { NeonSection } from "@/components/neon/NeonSection";
import { NeonCard } from "@/components/neon/NeonCard";
import type { ProgramSettings } from "@/lib/types";

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
  email?: string;
  pointsBalance: number;
  lifetimePoints: number;
  currentTier: string;
  streakCount: number;
};

export default function CustomerWalletPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const searchParams = useSearchParams();

  const initialContact = (searchParams.get("contact") || "").trim();

  const [phoneOrEmail, setPhoneOrEmail] = useState(initialContact);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [programSettings, setProgramSettings] = useState<ProgramSettings | null>(
    null,
  );
  const [customer, setCustomer] = useState<LoadedCustomer | null>(null);
  const [rewards, setRewards] = useState<RewardStoreItem[]>([]);

  function splitContact(value: string): { phone?: string; email?: string } {
    const trimmed = value.trim();
    if (!trimmed) return {};
    if (trimmed.includes("@")) return { email: trimmed.toLowerCase() };
    return { phone: trimmed };
  }

  async function performLookup(raw: string) {
    if (!orgId) return;
    const { phone, email } = splitContact(raw);

    if (!phone && !email) {
      setLoadError("Enter a valid phone number.");
      return;
    }

    setLoading(true);
    setLoadError(null);
    setCustomer(null);
    setProgramSettings(null);
    setRewards([]);

    try {
      const res = await fetch(`/api/orgs/${orgId}/loyalty/customer/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.found) {
        setLoadError(
          data?.error ||
            "We couldn’t find a wallet for that contact. Ask staff to add points for you first.",
        );
        return;
      }

      setCustomer(data.customer as LoadedCustomer);
      setProgramSettings(data.program as ProgramSettings);
      setRewards((data.rewards ?? []) as RewardStoreItem[]);
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load your wallet.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!phoneOrEmail.trim()) return;
    performLookup(phoneOrEmail);
  }

  // ---------- TIER LOGIC ----------
  const tierInfo = useMemo(() => {
    // No customer at all – fall back to a basic default
    if (!customer) {
      return {
        currentTierLabel: "TIER 1",
        nextTierLabel: null as string | null,
        currentThreshold: 0,
        nextThreshold: 0,
      };
    }

    // Customer exists but we don't have settings yet
    if (!programSettings) {
      return {
        currentTierLabel: customer.currentTier.toUpperCase(),
        nextTierLabel: null as string | null,
        currentThreshold: 0,
        nextThreshold: 0,
      };
    }

    // Ensure numeric thresholds & safe names
    const tierThresholds: Record<string, number> =
      programSettings.tierThresholds ?? {};
    const tierNames: Record<string, string> = programSettings.tierNames ?? {};

    const key = customer.currentTier;
    const currentThreshold = tierThresholds[key] ?? 0;

    const sorted = Object.entries(tierThresholds).sort(
      ([, aVal], [, bVal]) => aVal - bVal,
    );

    let nextKey: string | null = null;
    for (const [tKey, threshold] of sorted) {
      if (customer.lifetimePoints < threshold) {
        nextKey = tKey;
        break;
      }
    }

    return {
      currentTierLabel: tierNames[key] ?? key.toUpperCase(),
      nextTierLabel: nextKey
        ? tierNames[nextKey] ?? nextKey.toUpperCase()
        : null,
      currentThreshold,
      nextThreshold: nextKey
        ? tierThresholds[nextKey] ?? currentThreshold
        : currentThreshold,
    };
  }, [customer, programSettings]);

  const progressPercent = useMemo(() => {
    if (!customer) return 0;
    const { currentThreshold, nextThreshold } = tierInfo;
    if (nextThreshold <= currentThreshold) return 100;

    const totalSpan = nextThreshold - currentThreshold;
    const gained = customer.lifetimePoints - currentThreshold;
    return Math.max(0, Math.min(100, (gained / totalSpan) * 100));
  }, [customer, tierInfo]);

  const nextReward = useMemo(() => {
    if (!customer || !rewards.length) return null;
    const above = rewards
      .filter((r) => r.pointsCost > customer.pointsBalance)
      .sort((a, b) => a.pointsCost - b.pointsCost);

    if (above.length) return above[0];
    return [...rewards].sort((a, b) => a.pointsCost - b.pointsCost)[0];
  }, [customer, rewards]);

  return (
    <NeonSection>
      {/* ---------- HEADER ---------- */}
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.25em] text-cyan-300/80">
          NeonHQ · RewardCircle
        </p>
        <h1 className="text-2xl font-semibold">Your RewardCircle Wallet</h1>
        <p className="text-sm text-slate-300/80">
          Enter your phone number to view your points, tier, and available
          rewards.
        </p>
      </div>

      {/* ---------- FIND WALLET ---------- */}
      <NeonCard>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs text-slate-300/90">
              Phone Number
            </label>
            <input
              value={phoneOrEmail}
              onChange={(e) => setPhoneOrEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-cyan-400 focus:ring-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Find My Wallet"}
          </button>
        </form>

        {loadError && (
          <p className="mt-3 text-xs text-red-300">{loadError}</p>
        )}
      </NeonCard>

      {/* ---------- CUSTOMER SUMMARY ---------- */}
      {customer && (
        <NeonCard>
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Hi, {customer.name}</h2>
              <p className="text-sm text-slate-300/80">
                {customer.lifetimePoints} lifetime points ·{" "}
                {customer.streakCount}-day streak
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs uppercase text-slate-400">
                Current Tier
              </div>
              <div className="text-2xl font-bold text-cyan-300">
                {tierInfo.currentTierLabel}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>{tierInfo.currentThreshold} pts</span>
              <span>
                {tierInfo.nextTierLabel
                  ? `${tierInfo.nextThreshold} → ${tierInfo.nextTierLabel}`
                  : "Max tier reached"}
              </span>
            </div>
          </div>

          {/* Balance box */}
          <div className="mt-4 rounded-xl border border-cyan-400/40 bg-slate-950/70 p-3">
            <div className="text-xs uppercase text-slate-400">
              Points Available
            </div>
            <div className="text-3xl font-extrabold">
              {customer.pointsBalance}
            </div>

            {nextReward && (
              <p className="mt-1 text-xs text-slate-300/80">
                Next reward:{" "}
                <span className="font-semibold">{nextReward.name}</span> (
                {nextReward.pointsCost} pts)
              </p>
            )}
          </div>
        </NeonCard>
      )}

      {/* ---------- REWARD STORE ---------- */}
      <NeonCard>
        <h2 className="text-lg font-semibold">Reward Store</h2>
        <p className="text-sm text-slate-300/80">
          Redeem rewards at the counter by providing your phone number.
        </p>

        {!customer && (
          <p className="mt-4 text-sm text-slate-400">
            Enter your phone/email above to see your rewards.
          </p>
        )}

        {customer && rewards.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">
            No rewards available yet — check back soon!
          </p>
        )}

        {customer && rewards.length > 0 && (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((reward) => {
              const canAfford = customer.pointsBalance >= reward.pointsCost;

              return (
                <li
                  key={reward.id}
                  className="rounded-xl border border-slate-700/70 bg-slate-950/80 p-4"
                >
                  <div className="font-semibold text-slate-50">
                    {reward.name}
                  </div>
                  {reward.description && (
                    <p className="mt-1 text-xs text-slate-400">
                      {reward.description}
                    </p>
                  )}

                  <div className="mt-3 flex justify-between text-sm">
                    <div className="text-slate-200">
                      Cost: <b>{reward.pointsCost} pts</b>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        canAfford
                          ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
                          : "border border-slate-700 bg-slate-800 text-slate-400"
                      }`}
                    >
                      {canAfford ? "You can redeem" : "Keep earning"}
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