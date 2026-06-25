"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

type RewardCircleMember = {
  memberId: string;
  displayName: string;
  phone?: string;
  email?: string;
};

type RewardCircleWallet = {
  status: string;

  pointsBalance: number;
  lifetimePointsEarned: number;
  lifetimePointsRedeemed: number;

  currentTier: string;
  currentTierName?: string;

  totalVisits: number;
  streakCount: number;

  joinedAt?: unknown;
  lastActivityAt?: unknown;
  lastVisitDate?: unknown;
  lastEarnedAt?: unknown;
  lastRedeemedAt?: unknown;

  joinedAtMs?: number;
  lastActivityAtMs?: number;
  lastVisitDateMs?: number;
  lastEarnedAtMs?: number;
  lastRedeemedAtMs?: number;
};

type RewardCirclePublicTier = {
  tierId: string;
  name: string;
  threshold: number;
  badgeLabel?: string;
  description?: string;
  sortOrder: number;
};

type RewardCirclePublicProgram = {
  orgId: string;
  programName: string;
  headline: string;
  description: string;
  rewardCurrencyName: string;
  howItWorksSteps: string[];
  joinCallToAction: string;
  tiers: RewardCirclePublicTier[];
};

type RewardCircleTierProgress = {
  currentTier: string;
  currentTierName: string;
  currentThreshold: number;
  nextTier: string | null;
  nextTierName: string | null;
  nextThreshold: number | null;
  progressPercent: number;
  pointsToNextTier: number;
};

type WalletResponse =
  | {
      found: true;
      authenticated?: boolean;
      member: RewardCircleMember;
      wallet: RewardCircleWallet;
      program: RewardCirclePublicProgram;
      tierProgress: RewardCircleTierProgress;
      session?: {
        sessionId?: string;
        memberId?: string;
        orgId?: string;
        expiresAtMs?: number;
      };
      lookup?: {
        type?: "phone" | "email";
        matched?: boolean;
      };
    }
  | {
      found: false;
      authenticated?: false;
      reason?: string;
      error?: string;
    };

type RewardCircleWalletClientProps = {
  orgId: string;
};

function formatNumber(value: unknown) {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n)) return "0";

  return new Intl.NumberFormat("en-US").format(n);
}

function formatDate(value: unknown) {
  if (!value) return "Not yet";

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  ) {
    const date = new Date((value as { seconds: number }).seconds * 1000);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  return "Not yet";
}

function walletStatusLabel(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "active") return "Wallet Active";
  if (normalized === "inactive") return "Wallet Inactive";
  if (normalized === "banned") return "See Staff";

  return status || "Wallet";
}

function WalletTag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)]">
      {children}
    </span>
  );
}

function GlowRail() {
  return (
    <div className="relative h-px w-full overflow-hidden bg-white/10">
      <div className="absolute inset-y-0 left-0 w-1/2 animate-[rewardRail_3.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
    </div>
  );
}

function FloatPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-[0_0_50px_rgba(15,23,42,0.65)] backdrop-blur-xl",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.14),transparent_42%)]",
        "after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-cyan-300/70 after:to-transparent",
        className,
      ].join(" ")}
    >
      <div className="relative">{children}</div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}
    </div>
  );
}

function TierPill({
  tier,
  active,
}: {
  tier: RewardCirclePublicTier;
  active: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3",
        active
          ? "border-cyan-300/45 bg-cyan-300/10 shadow-[0_0_30px_rgba(34,211,238,0.16)]"
          : "border-white/10 bg-white/[0.03]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={[
            "text-sm font-black uppercase tracking-[0.12em]",
            active ? "text-cyan-100" : "text-slate-200",
          ].join(" ")}
        >
          {tier.badgeLabel || tier.name}
        </p>
        <p className="text-xs font-bold text-slate-400">
          {formatNumber(tier.threshold)}
        </p>
      </div>
      {tier.description && (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
          {tier.description}
        </p>
      )}
    </div>
  );
}

export default function RewardCircleWalletClient({
  orgId,
}: RewardCircleWalletClientProps) {
  const searchParams = useSearchParams();
  const initialContact = (searchParams.get("contact") || "").trim();

  const [phone, setPhone] = useState(initialContact);
  const [lastLookupPhone, setLastLookupPhone] = useState(initialContact);

  const [loading, setLoading] = useState(false);
  const [autoLookedUp, setAutoLookedUp] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [member, setMember] = useState<RewardCircleMember | null>(null);
  const [wallet, setWallet] = useState<RewardCircleWallet | null>(null);
  const [program, setProgram] = useState<RewardCirclePublicProgram | null>(null);
  const [tierProgress, setTierProgress] =
    useState<RewardCircleTierProgress | null>(null);

  const baseHref = `/orgs/${orgId}/customer/reward-circle`;

  const rewardCurrencyName = program?.rewardCurrencyName || "Points";

  function clearWalletState() {
  setMember(null);
  setWallet(null);
  setProgram(null);
  setTierProgress(null);
}

async function loadSessionWallet() {
  if (!orgId) {
    setLoadError("This RewardCircle page is missing an organization ID.");
    return;
  }

  setLoading(true);
  setLoadError(null);

  try {
    const res = await fetch(`/api/orgs/${orgId}/customer/reward-circle/me`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });

    const data = (await res.json().catch(() => ({}))) as WalletResponse;

    if (!res.ok || !data.found) {
      clearWalletState();
      return;
    }

    setMember(data.member);
    setWallet(data.wallet);
    setProgram(data.program);
    setTierProgress(data.tierProgress);
  } catch (error: any) {
    console.error(error);
    clearWalletState();
  } finally {
    setLoading(false);
  }
}

  const shopHref = useMemo(() => {
    const contact = (lastLookupPhone || phone).trim();

    if (!contact) return `${baseHref}/shop`;

    return `${baseHref}/shop?contact=${encodeURIComponent(contact)}`;
  }, [baseHref, lastLookupPhone, phone]);

  const sortedTiers = useMemo(() => {
    return [...(program?.tiers ?? [])].sort((a, b) => {
      if (a.threshold !== b.threshold) return a.threshold - b.threshold;
      return a.sortOrder - b.sortOrder;
    });
  }, [program?.tiers]);

async function performLookup(rawPhone: string) {
  const cleanPhone = rawPhone.trim();

  if (!orgId) {
    setLoadError("This RewardCircle page is missing an organization ID.");
    return;
  }

  if (!cleanPhone) {
    setLoadError("Enter your phone number to open your wallet.");
    return;
  }

  setLoading(true);
  setLoadError(null);

  try {
    const res = await fetch(
      `/api/orgs/${orgId}/customer/reward-circle/lookup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "phone",
          value: cleanPhone,
        }),
      },
    );

    const data = (await res.json().catch(() => ({}))) as WalletResponse;

    if (!res.ok || !data.found) {
      clearWalletState();

      const errorMessage =
        "error" in data && data.error
          ? data.error
          : "We couldn’t find a RewardCircle wallet for that phone number yet.";

      setLoadError(errorMessage);
      return;
    }

    setMember(data.member);
    setWallet(data.wallet);
    setProgram(data.program);
    setTierProgress(data.tierProgress);
    setLastLookupPhone(cleanPhone);
  } catch (error: any) {
    clearWalletState();
    setLoadError(error?.message || "Failed to load your RewardCircle wallet.");
  } finally {
    setLoading(false);
  }
}
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void performLookup(phone);
  }

useEffect(() => {
  if (autoLookedUp) return;

  setAutoLookedUp(true);

  if (initialContact) {
    void performLookup(initialContact);
    return;
  }

  void loadSessionWallet();

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [initialContact, autoLookedUp]);

  const hasWallet = Boolean(member && wallet && tierProgress);

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,0.20),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.16),transparent_34%),radial-gradient(circle_at_50%_90%,rgba(16,185,129,0.13),transparent_40%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:64px_64px]"
      />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/orgs/${orgId}`}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
          >
            OwnerOptics
          </Link>

          <div className="flex flex-wrap gap-2">
            <WalletTag>Points Live</WalletTag>
            <WalletTag>Earned Value</WalletTag>
            <WalletTag>Reward Wallet</WalletTag>
          </div>
        </div>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          <div className="space-y-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-200/80">
                RewardCircle Wallet
              </p>

              <h1 className="mt-5 max-w-5xl text-6xl font-black uppercase leading-[0.86] tracking-[-0.08em] text-white sm:text-7xl md:text-8xl xl:text-9xl">
                Open Your
                <span className="block bg-gradient-to-r from-cyan-200 via-emerald-200 to-fuchsia-200 bg-clip-text text-transparent">
                  Reward Wallet
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-300 sm:text-xl">
                Enter your phone number to see your points, tier, visits, and
                earned value. Your rewards are waiting inside the circle.
              </p>
            </div>

            <GlowRail />

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricBox
                label="Wallet"
                value={hasWallet ? walletStatusLabel(wallet!.status) : "Locked"}
                detail="Use your phone number to open it."
              />
              <MetricBox
                label="Currency"
                value={rewardCurrencyName}
                detail="Earn it. Hold it. Redeem it."
              />
              <MetricBox
                label="Shop"
                value="Ready"
                detail="Open the shop when your points are live."
              />
            </div>
          </div>

          <FloatPanel className="p-5 sm:p-6 lg:p-7">
            {!hasWallet ? (
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-200">
                    Find Your Points
                  </p>
                  <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.05em] text-white sm:text-5xl">
                    Phone.
                    <span className="block text-cyan-200">Open.</span>
                    <span className="block text-fuchsia-200">See Value.</span>
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    Use the same phone number you gave staff when joining or
                    earning points.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                      Phone Number
                    </label>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="(555) 555-5555"
                      className="w-full rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-lg font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-emerald-300 to-fuchsia-300 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-950 shadow-[0_0_40px_rgba(34,211,238,0.18)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Opening Wallet..." : "Open Wallet →"}
                  </button>
                </form>

                {loadError && (
                  <div className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100">
                    {loadError}
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                    No wallet yet?
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Ask staff to add you to RewardCircle the next time you earn
                    points.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-200">
                      Your Value Is Live
                    </p>
                    <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.05em] text-white sm:text-5xl">
                      {member!.displayName}
                    </h2>
                    <p className="mt-3 text-sm text-slate-400">
                      {walletStatusLabel(wallet!.status)} ·{" "}
                      {tierProgress!.currentTierName}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMember(null);
                      setWallet(null);
                      setProgram(null);
                      setTierProgress(null);
                      setLoadError(null);
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
                  >
                    Switch
                  </button>
                </div>

                <div className="relative overflow-hidden rounded-[1.75rem] border border-cyan-300/20 bg-black/35 p-5 shadow-[0_0_60px_rgba(34,211,238,0.12)]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-y-10 -left-1/2 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-sm animate-[walletSweep_5.8s_ease-in-out_infinite]"
                  />

                  <div className="relative flex items-end justify-between gap-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                        Available {rewardCurrencyName}
                      </p>
                      <p className="mt-2 bg-gradient-to-r from-cyan-100 via-emerald-100 to-fuchsia-100 bg-clip-text text-7xl font-black leading-none tracking-[-0.08em] text-transparent sm:text-8xl">
                        {formatNumber(wallet!.pointsBalance)}
                      </p>
                    </div>

                    <div className="hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-right sm:block">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Tier
                      </p>
                      <p className="mt-1 text-xl font-black uppercase text-cyan-100">
                        {tierProgress!.currentTierName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricBox
                    label="Lifetime Earned"
                    value={formatNumber(wallet!.lifetimePointsEarned)}
                    detail={`Total ${rewardCurrencyName} earned.`}
                  />
                  <MetricBox
                    label="Lifetime Redeemed"
                    value={formatNumber(wallet!.lifetimePointsRedeemed)}
                    detail="Value already used."
                  />
                  <MetricBox
                    label="Total Visits"
                    value={formatNumber(wallet!.totalVisits)}
                    detail="Recorded RewardCircle visits."
                  />
                  <MetricBox
                    label="Visit Streak"
                    value={formatNumber(wallet!.streakCount)}
                    detail="Current return momentum."
                  />
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">
                        Tier Progress
                      </p>
                      <h3 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em] text-white">
                        {tierProgress!.nextTierName
                          ? `${formatNumber(
                              tierProgress!.pointsToNextTier,
                            )} ${rewardCurrencyName} to ${
                              tierProgress!.nextTierName
                            }`
                          : "Top tier reached"}
                      </h3>
                    </div>

                    <p className="text-right text-sm font-bold text-cyan-100">
                      {Math.round(tierProgress!.progressPercent)}%
                    </p>
                  </div>

                  <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-900 ring-1 ring-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-fuchsia-300 shadow-[0_0_28px_rgba(34,211,238,0.25)]"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, tierProgress!.progressPercent),
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>{formatNumber(tierProgress!.currentThreshold)}</span>
                    <span>
                      {tierProgress!.nextThreshold
                        ? formatNumber(tierProgress!.nextThreshold)
                        : "MAX"}
                    </span>
                  </div>
                </div>

                {sortedTiers.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">
                      Tier Ladder
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {sortedTiers.map((tier) => (
                        <TierPill
                          key={tier.tierId}
                          tier={tier}
                          active={tier.tierId === tierProgress!.currentTier}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <FloatPanel className="border-emerald-300/20 bg-emerald-300/[0.04] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-200">
                        Ready To Redeem?
                      </p>
                      <h3 className="mt-2 text-3xl font-black uppercase leading-none tracking-[-0.05em] text-white">
                        Open The Reward Shop
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        See what your points can unlock and bring your phone
                        number to staff when you are ready.
                      </p>
                    </div>

                    <Link
                      href={shopHref}
                      className="rounded-2xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-950 shadow-[0_0_40px_rgba(16,185,129,0.16)] transition hover:scale-[1.02]"
                    >
                      View Rewards →
                    </Link>
                  </div>
                </FloatPanel>

                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricBox
                    label="Joined"
                    value={formatDate(wallet!.joinedAt)}
                  />
                  <MetricBox
                    label="Last Earned"
                    value={formatDate(wallet!.lastEarnedAt)}
                  />
                  <MetricBox
                    label="Last Redeemed"
                    value={formatDate(wallet!.lastRedeemedAt)}
                  />
                </div>
              </div>
            )}
          </FloatPanel>
        </div>
      </section>

      <style jsx global>{`
        @keyframes rewardRail {
          0% {
            transform: translateX(-120%);
            opacity: 0;
          }
          25% {
            opacity: 0.9;
          }
          55% {
            transform: translateX(260%);
            opacity: 0.35;
          }
          100% {
            transform: translateX(260%);
            opacity: 0;
          }
        }

        @keyframes walletSweep {
          0% {
            transform: translateX(-20%) rotate(12deg);
            opacity: 0;
          }
          20% {
            opacity: 0.55;
          }
          52% {
            transform: translateX(210%) rotate(12deg);
            opacity: 0.3;
          }
          72%,
          100% {
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </main>
  );
}