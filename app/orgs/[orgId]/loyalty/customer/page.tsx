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

const ACCENTS = [
  {
    key: "cyan",
    ring: "ring-cyan-400/40",
    glow: "hover:shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_0_28px_rgba(34,211,238,0.18)]",
    strip: "from-cyan-400/80 via-cyan-400/20 to-transparent",
    trim: "from-cyan-400/70 via-purple-400/40 to-transparent",
    badge: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
  },
  {
    key: "purple",
    ring: "ring-purple-400/40",
    glow: "hover:shadow-[0_0_0_1px_rgba(167,139,250,0.22),0_0_28px_rgba(167,139,250,0.18)]",
    strip: "from-purple-400/80 via-purple-400/20 to-transparent",
    trim: "from-purple-400/70 via-cyan-400/40 to-transparent",
    badge: "border-purple-400/30 bg-purple-500/10 text-purple-200",
  },
  {
    key: "emerald",
    ring: "ring-emerald-400/40",
    glow: "hover:shadow-[0_0_0_1px_rgba(52,211,153,0.22),0_0_28px_rgba(52,211,153,0.16)]",
    strip: "from-emerald-400/80 via-emerald-400/20 to-transparent",
    trim: "from-emerald-400/70 via-cyan-400/40 to-transparent",
    badge: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  },
  {
    key: "amber",
    ring: "ring-amber-400/40",
    glow: "hover:shadow-[0_0_0_1px_rgba(251,191,36,0.20),0_0_28px_rgba(251,191,36,0.14)]",
    strip: "from-amber-400/80 via-amber-400/20 to-transparent",
    trim: "from-amber-400/70 via-purple-400/35 to-transparent",
    badge: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  },
] as const;

function accentForIndex(i: number) {
  return ACCENTS[i % ACCENTS.length];
}

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
  <div className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/70 p-5 ring-1 ring-cyan-400/20">
    {/* neon trim */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_top,_rgba(34,211,238,0.18)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(167,139,250,0.14)_0,_transparent_55%)]"
    />

    {/* reflective sweep */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-y-10 -left-1/3 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-sm"
      style={{
        animation: "walletSweep 5.5s ease-in-out infinite",
      }}
    />

    {/* content */}
    <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/60 text-sm font-bold text-cyan-200">
            RC
          </span>

          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold tracking-tight">
              {customer.name}
            </h2>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-slate-200/90">
                {customer.lifetimePoints} lifetime pts
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-slate-200/90">
                {customer.streakCount}-day streak
              </span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-200">
                {tierInfo.currentTierLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* points balance */}
      <div className="w-full max-w-sm rounded-2xl border border-cyan-400/25 bg-slate-950/60 p-4 ring-1 ring-white/5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Points Available
            </div>
            <div className="mt-1 text-4xl font-extrabold leading-none">
              <span className="bg-gradient-to-r from-cyan-200 via-emerald-200 to-purple-200 bg-clip-text text-transparent">
                {customer.pointsBalance}
              </span>
            </div>
          </div>

          <div className="h-9 w-9 rounded-xl border border-slate-700/70 bg-slate-900/60 p-2">
            <div className="h-full w-full rounded-md bg-gradient-to-br from-slate-200/10 to-transparent" />
          </div>
        </div>

        {nextReward && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-slate-800/70 bg-slate-900/30 px-3 py-2 text-xs">
            <span className="text-slate-300/90">Next reward</span>
            <span className="truncate font-semibold text-slate-100">
              {nextReward.name} · {nextReward.pointsCost} pts
            </span>
          </div>
        )}

        {/* progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{tierInfo.currentThreshold} pts</span>
            <span>
              {tierInfo.nextTierLabel
                ? `${tierInfo.nextThreshold} → ${tierInfo.nextTierLabel}`
                : "Max tier reached"}
            </span>
          </div>

          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>

    {/* keyframes (scoped via global style tag) */}
    <style jsx global>{`
      @keyframes walletSweep {
        0% {
          transform: translateX(-20%) rotate(12deg);
          opacity: 0;
        }
        20% {
          opacity: 0.55;
        }
        50% {
          transform: translateX(180%) rotate(12deg);
          opacity: 0.3;
        }
        70%,
        100% {
          opacity: 0;
        }
      }
    `}</style>
  </div>
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
            {rewards.map((reward, i) => {
  const canAfford = customer.pointsBalance >= reward.pointsCost;
  const accent = accentForIndex(i);

  return (
    <li
      key={reward.id}
      className={[
        "group relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/80 p-4",
        "transition-all duration-200 hover:-translate-y-0.5",
        "ring-1 ring-white/5",
        accent.glow,
      ].join(" ")}
    >
      {/* left neon strip */}
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b",
          accent.strip,
        ].join(" ")}
      />

      {/* top neon trim */}
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r",
          accent.trim,
        ].join(" ")}
      />

      {/* subtle interior glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 opacity-0 blur-2xl transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(34,211,238,0.12), transparent 55%), radial-gradient(circle at 70% 80%, rgba(167,139,250,0.10), transparent 60%)",
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-slate-50">
              {reward.name}
            </div>
            {reward.description && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                {reward.description}
              </p>
            )}
          </div>

          <span
            className={[
              "shrink-0 rounded-full border px-2 py-0.5 text-[11px]",
              canAfford
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                : "border-slate-700 bg-slate-900/60 text-slate-400",
            ].join(" ")}
          >
            {canAfford ? "Redeemable" : "Keep earning"}
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div className="text-sm text-slate-200">
            Cost: <b>{reward.pointsCost} pts</b>
          </div>

          <span
            className={[
              "rounded-full border px-2 py-0.5 text-[11px]",
              accent.badge,
            ].join(" ")}
          >
            Neon Store
          </span>
        </div>
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