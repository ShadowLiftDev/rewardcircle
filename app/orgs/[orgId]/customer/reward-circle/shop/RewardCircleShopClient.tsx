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

type PublicTier = {
  tierId: string;
  name: string;
  threshold: number;
  badgeLabel?: string;
  description?: string;
  sortOrder: number;
};

type PublicReward = {
  rewardId: string;
  orgId: string;

  title: string;
  description: string;

  pointsCost: number;

  category?: string;
  imageUrl?: string;

  isFeatured: boolean;

  redemptionInstructions?: string;

  sortOrder: number;

  startsAt?: unknown;
  endsAt?: unknown;
};

type PublicShop = {
  orgId: string;

  programName: string;

  rewardCurrencyName: string;

  headline: string;
  description: string;
  howItWorksSteps: string[];

  joinCallToAction: string;

  tiers: PublicTier[];
};

type ShopResponse =
  | {
      shop: PublicShop;
      rewards: PublicReward[];
      featuredRewards: PublicReward[];
    }
  | {
      error?: string;
    };

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
};

type RewardCirclePublicProgram = {
  orgId: string;
  programName: string;
  headline: string;
  description: string;
  rewardCurrencyName: string;
  howItWorksSteps: string[];
  joinCallToAction: string;
  tiers: PublicTier[];
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
      member: RewardCircleMember;
      wallet: RewardCircleWallet;
      program: RewardCirclePublicProgram;
      tierProgress: RewardCircleTierProgress;
    }
  | {
      found: false;
      error?: string;
    };

type RewardCircleShopClientProps = {
  orgId: string;
};

function formatNumber(value: unknown) {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n)) return "0";

  return new Intl.NumberFormat("en-US").format(n);
}

function walletStatusLabel(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "active") return "Wallet Open";
  if (normalized === "inactive") return "Wallet Inactive";
  if (normalized === "banned") return "See Staff";

  return status || "Wallet";
}

function ShopTag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-fuchsia-100 shadow-[0_0_20px_rgba(217,70,239,0.12)]">
      {children}
    </span>
  );
}

function GlowRail() {
  return (
    <div className="relative h-px w-full overflow-hidden bg-white/10">
      <div className="absolute inset-y-0 left-0 w-1/2 animate-[shopRail_3.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-fuchsia-300 to-transparent" />
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
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.16),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.14),transparent_42%)]",
        "after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-fuchsia-300/70 after:to-transparent",
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

function TierChip({ tier }: { tier: PublicTier }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-100">
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

function RewardCard({
  reward,
  wallet,
  rewardCurrencyName,
}: {
  reward: PublicReward;
  wallet: RewardCircleWallet | null;
  rewardCurrencyName: string;
}) {
  const hasWallet = Boolean(wallet);
  const canAfford = wallet ? wallet.pointsBalance >= reward.pointsCost : false;
  const pointsAway = wallet
    ? Math.max(0, reward.pointsCost - wallet.pointsBalance)
    : null;

  const badgeLabel = !hasWallet
    ? "Open Wallet"
    : canAfford
      ? "Redeemable Now"
      : `${formatNumber(pointsAway)} Away`;

  return (
    <article className="group relative flex min-h-[280px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/75 p-5 shadow-[0_0_40px_rgba(15,23,42,0.45)] transition duration-200 hover:-translate-y-1 hover:border-fuchsia-300/35 hover:shadow-[0_0_55px_rgba(217,70,239,0.12)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition duration-200 group-hover:opacity-100 [background-image:radial-gradient(circle_at_25%_15%,rgba(217,70,239,0.16),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(34,211,238,0.14),transparent_45%)]"
      />

      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          canAfford
            ? "via-emerald-300/80"
            : hasWallet
              ? "via-cyan-300/70"
              : "via-fuchsia-300/70",
        ].join(" ")}
      />

      <div className="relative flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {reward.category && (
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                {reward.category}
              </p>
            )}

            <h3 className="text-2xl font-black uppercase leading-none tracking-[-0.05em] text-white">
              {reward.title}
            </h3>
          </div>

          {reward.isFeatured && (
            <span className="shrink-0 rounded-full border border-fuchsia-300/30 bg-fuchsia-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100">
              Featured
            </span>
          )}
        </div>

        {reward.imageUrl && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={reward.imageUrl}
              alt={reward.title}
              className="h-40 w-full object-cover opacity-90 transition duration-200 group-hover:scale-[1.03]"
            />
          </div>
        )}

        {reward.description && (
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-300">
            {reward.description}
          </p>
        )}

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                Cost
              </p>
              <p className="mt-1 text-3xl font-black tracking-[-0.05em] text-white">
                {formatNumber(reward.pointsCost)}
                <span className="ml-2 text-sm font-bold tracking-normal text-slate-400">
                  {rewardCurrencyName}
                </span>
              </p>
            </div>

            <span
              className={[
                "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
                canAfford
                  ? "border-emerald-300/40 bg-emerald-300/12 text-emerald-100"
                  : hasWallet
                    ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                    : "border-white/10 bg-white/[0.04] text-slate-300",
              ].join(" ")}
            >
              {badgeLabel}
            </span>
          </div>

          {reward.redemptionInstructions && (
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs leading-5 text-slate-300">
              {reward.redemptionInstructions}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default function RewardCircleShopClient({
  orgId,
}: RewardCircleShopClientProps) {
  const searchParams = useSearchParams();
  const initialContact = (searchParams.get("contact") || "").trim();

  const baseHref = `/orgs/${orgId}/customer/reward-circle`;

  const [shop, setShop] = useState<PublicShop | null>(null);
  const [rewards, setRewards] = useState<PublicReward[]>([]);
  const [featuredRewards, setFeaturedRewards] = useState<PublicReward[]>([]);

  const [phone, setPhone] = useState(initialContact);
  const [autoLookedUp, setAutoLookedUp] = useState(false);

  const [member, setMember] = useState<RewardCircleMember | null>(null);
  const [wallet, setWallet] = useState<RewardCircleWallet | null>(null);
  const [tierProgress, setTierProgress] =
    useState<RewardCircleTierProgress | null>(null);

  const [shopLoading, setShopLoading] = useState(true);
  const [walletLoading, setWalletLoading] = useState(false);

  const [shopError, setShopError] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  const rewardCurrencyName = shop?.rewardCurrencyName || "points";

  const sortedTiers = useMemo(() => {
    return [...(shop?.tiers ?? [])].sort((a, b) => {
      if (a.threshold !== b.threshold) return a.threshold - b.threshold;
      return a.sortOrder - b.sortOrder;
    });
  }, [shop?.tiers]);

  const affordableRewards = useMemo(() => {
    if (!wallet) return [];

    return rewards.filter((reward) => wallet.pointsBalance >= reward.pointsCost);
  }, [rewards, wallet]);

  const heroRewards = featuredRewards.length > 0 ? featuredRewards : rewards.slice(0, 3);

  function clearWalletState() {
    setMember(null);
    setWallet(null);
    setTierProgress(null);
  }

  async function loadShop() {
    if (!orgId) {
      setShopError("This RewardCircle shop is missing an organization ID.");
      setShopLoading(false);
      return;
    }

    setShopLoading(true);
    setShopError(null);

    try {
      const res = await fetch(
        `/api/orgs/${orgId}/customer/reward-circle/shop?count=100`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const data = (await res.json().catch(() => ({}))) as ShopResponse;

      if (!res.ok || !("shop" in data)) {
        setShop(null);
        setRewards([]);
        setFeaturedRewards([]);
        setShopError(
          "error" in data && data.error
            ? data.error
            : "Failed to load the RewardCircle shop.",
        );
        return;
      }

      setShop(data.shop);
      setRewards(data.rewards ?? []);
      setFeaturedRewards(data.featuredRewards ?? []);
    } catch (error: any) {
      setShopError(error?.message || "Failed to load the RewardCircle shop.");
    } finally {
      setShopLoading(false);
    }
  }

  async function performWalletLookup(rawPhone: string) {
    const cleanPhone = rawPhone.trim();

    if (!orgId) {
      setWalletError("This RewardCircle page is missing an organization ID.");
      return;
    }

    if (!cleanPhone) {
      setWalletError("Enter your phone number to connect your wallet.");
      return;
    }

    setWalletLoading(true);
    setWalletError(null);

    try {
      const res = await fetch(`/api/orgs/${orgId}/customer/reward-circle/me`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: cleanPhone,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as WalletResponse;

      if (!res.ok) {
        clearWalletState();

        const errorMessage =
          "error" in data && data.error
            ? data.error
            : "We couldn’t find a RewardCircle wallet for that phone number yet.";

        setWalletError(errorMessage);
        return;
      }

      if (!data.found) {
        clearWalletState();
        setWalletError(
          data.error ||
            "We couldn’t find a RewardCircle wallet for that phone number yet.",
        );
        return;
      }

      setMember(data.member);
      setWallet(data.wallet);
      setTierProgress(data.tierProgress);
      setPhone(cleanPhone);
    } catch (error: any) {
      setWalletError(error?.message || "Failed to connect your wallet.");
    } finally {
      setWalletLoading(false);
    }
  }

  function handleWalletSubmit(event: FormEvent) {
    event.preventDefault();
    void performWalletLookup(phone);
  }

  useEffect(() => {
    void loadShop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  useEffect(() => {
    if (!initialContact || autoLookedUp) return;

    setAutoLookedUp(true);
    void performWalletLookup(initialContact);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContact, autoLookedUp]);

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(217,70,239,0.20),transparent_34%),radial-gradient(circle_at_82%_20%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_50%_95%,rgba(16,185,129,0.13),transparent_40%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:64px_64px]"
      />

      <section className="relative mx-auto min-h-screen w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={baseHref}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
          >
            ← Wallet
          </Link>

          <div className="flex flex-wrap gap-2">
            <ShopTag>Reward Shop</ShopTag>
            <ShopTag>Prize Wall</ShopTag>
            <ShopTag>Redeem Value</ShopTag>
          </div>
        </div>

        <div className="grid items-center gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          <div className="space-y-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-fuchsia-200/80">
                RewardCircle Shop
              </p>

              <h1 className="mt-5 max-w-5xl text-6xl font-black uppercase leading-[0.86] tracking-[-0.08em] text-white sm:text-7xl md:text-8xl xl:text-9xl">
                Points Turn
                <span className="block bg-gradient-to-r from-fuchsia-200 via-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                  Into Perks
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-300 sm:text-xl">
                {shop?.description ||
                  "Browse what your RewardCircle points can unlock. Open your wallet to see what you can redeem right now."}
              </p>
            </div>

            <GlowRail />

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricBox
                label="Available Rewards"
                value={shopLoading ? "..." : formatNumber(rewards.length)}
                detail="Public rewards in this shop."
              />
              <MetricBox
                label="Featured"
                value={shopLoading ? "..." : formatNumber(featuredRewards.length)}
                detail="Highlighted rewards."
              />
              <MetricBox
                label="Wallet"
                value={wallet ? walletStatusLabel(wallet.status) : "Optional"}
                detail={
                  wallet
                    ? `${formatNumber(wallet.pointsBalance)} ${rewardCurrencyName} live.`
                    : "Connect to check redeemable rewards."
                }
              />
            </div>
          </div>

          <FloatPanel className="p-5 sm:p-6 lg:p-7">
            {wallet ? (
              <div className="space-y-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-200">
                    Wallet Connected
                  </p>
                  <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.05em] text-white sm:text-5xl">
                    Hey, {member?.displayName || "Member"}
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    You have{" "}
                    <span className="font-black text-emerald-100">
                      {formatNumber(wallet.pointsBalance)} {rewardCurrencyName}
                    </span>{" "}
                    available right now.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricBox
                    label="Redeemable Now"
                    value={formatNumber(affordableRewards.length)}
                    detail="Rewards you can unlock today."
                  />
                  <MetricBox
                    label="Tier"
                    value={tierProgress?.currentTierName || "Active"}
                    detail="Current RewardCircle level."
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    clearWalletState();
                    setWalletError(null);
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-300 transition hover:border-fuchsia-300/40 hover:text-fuchsia-100"
                >
                  Browse Without Wallet
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200">
                    Check Your Unlocks
                  </p>
                  <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.05em] text-white sm:text-5xl">
                    Open Wallet
                    <span className="block text-fuchsia-200">Inside Shop</span>
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    The shop is public. Connect your wallet to see which rewards
                    are redeemable now.
                  </p>
                </div>

                <form onSubmit={handleWalletSubmit} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                      Phone Number
                    </label>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="(555) 555-5555"
                      className="w-full rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-lg font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-fuchsia-300/60 focus:ring-4 focus:ring-fuchsia-300/10"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={walletLoading}
                    className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-300 via-cyan-300 to-emerald-300 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-950 shadow-[0_0_40px_rgba(217,70,239,0.18)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {walletLoading ? "Connecting Wallet..." : "Check My Unlocks →"}
                  </button>
                </form>

                {walletError && (
                  <div className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100">
                    {walletError}
                  </div>
                )}
              </div>
            )}
          </FloatPanel>
        </div>

        {shopError && (
          <div className="mb-8 rounded-[2rem] border border-red-300/20 bg-red-500/10 p-5 text-red-100">
            {shopError}
          </div>
        )}

        {shopLoading && (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-72 animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.035]"
              />
            ))}
          </div>
        )}

        {!shopLoading && !shopError && (
          <div className="space-y-10 pb-12">
            {heroRewards.length > 0 && (
              <section className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-fuchsia-200">
                      Featured Rewards
                    </p>
                    <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.06em] text-white sm:text-5xl">
                      Choose Your Unlock
                    </h2>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {heroRewards.map((reward) => (
                    <RewardCard
                      key={reward.rewardId}
                      reward={reward}
                      wallet={wallet}
                      rewardCurrencyName={rewardCurrencyName}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200">
                    All Rewards
                  </p>
                  <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.06em] text-white sm:text-5xl">
                    The Prize Wall
                  </h2>
                </div>

                <p className="max-w-md text-sm leading-6 text-slate-400">
                  Show your phone number to staff when you are ready to redeem.
                  Rewards are fulfilled by the business.
                </p>
              </div>

              {rewards.length === 0 ? (
                <FloatPanel className="p-6">
                  <p className="text-sm text-slate-300">
                    No rewards are available yet. Check back soon.
                  </p>
                </FloatPanel>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rewards.map((reward) => (
                    <RewardCard
                      key={reward.rewardId}
                      reward={reward}
                      wallet={wallet}
                      rewardCurrencyName={rewardCurrencyName}
                    />
                  ))}
                </div>
              )}
            </section>

            {sortedTiers.length > 0 && (
              <section className="space-y-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-200">
                    Tier Ladder
                  </p>
                  <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.06em] text-white sm:text-5xl">
                    Earn Higher
                  </h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {sortedTiers.map((tier) => (
                    <TierChip key={tier.tierId} tier={tier} />
                  ))}
                </div>
              </section>
            )}

            {shop?.howItWorksSteps && shop.howItWorksSteps.length > 0 && (
              <section className="space-y-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                    How It Works
                  </p>
                  <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.06em] text-white sm:text-5xl">
                    Earn. Hold. Redeem.
                  </h2>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  {shop.howItWorksSteps.map((step, index) => (
                    <div
                      key={`${step}-${index}`}
                      className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"
                    >
                      <p className="text-3xl font-black text-fuchsia-200">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </section>

      <style jsx global>{`
        @keyframes shopRail {
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