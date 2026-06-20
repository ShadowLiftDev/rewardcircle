"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RewardCircleAdminTabs } from "@/components/rewardcircle/RewardCircleAdminTabs";

type MemberWallet = {
  memberId?: string;
  id?: string;

  displayName?: string;
  name?: string;

  phone?: string;
  email?: string;

  status?: string;

  pointsBalance?: number;

  lifetimePointsEarned?: number;
  lifetimePoints?: number;

  lifetimePointsRedeemed?: number;

  currentTier?: string;
  currentTierName?: string;

  totalVisits?: number;
  streakCount?: number;

  joinedAt?: string | number | Date | null;
  lastActivityAt?: string | number | Date | null;
  lastVisitDate?: string | number | Date | null;
  lastEarnedAt?: string | number | Date | null;
  lastRedeemedAt?: string | number | Date | null;
};

type RewardCircleActivity = {
  id: string;
  type: string;

  pointsDelta?: number;
  pointsBalanceAfter?: number;

  rewardId?: string | null;
  rewardTitle?: string | null;

  staffUserId?: string | null;
  staffName?: string | null;

  note?: string | null;

  createdAt?: string | number | Date | null;
};

type MemberDetailResponse = {
  member?: MemberWallet;
  activity?: RewardCircleActivity[];
};

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function formatNumber(value: unknown) {
  return toNumber(value).toLocaleString();
}

function formatDate(value: unknown) {
  if (!value) return "—";

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (typeof value === "number") {
    return new Date(value).toLocaleString();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString();
    }
  }

  return "—";
}

function getDisplayName(member: MemberWallet) {
  return member.displayName || member.name || "RewardCircle Member";
}

function getMemberId(member: MemberWallet) {
  return String(member.memberId || member.id || "").trim();
}

function getLifetimeEarned(member: MemberWallet) {
  return toNumber(member.lifetimePointsEarned ?? member.lifetimePoints);
}

function getTierLabel(member: MemberWallet) {
  return member.currentTierName || member.currentTier || "Starter";
}

function getStatusLabel(member: MemberWallet) {
  return member.status || "active";
}

function statusClasses(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "active") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  if (normalized === "inactive" || normalized === "archived") {
    return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }

  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
}

function tierClasses(tier: string) {
  const normalized = tier.toLowerCase();

  if (normalized.includes("vip") || normalized.includes("expert")) {
    return "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200";
  }

  if (normalized.includes("intermediate")) {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
  }

  return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
}

function formatActivityType(type: string) {
  switch (type) {
    case "member_joined":
      return "MEMBER JOINED";
    case "visit_logged":
      return "VISIT LOGGED";
    case "points_earned":
      return "POINTS EARNED";
    case "points_redeemed":
      return "POINTS REDEEMED";
    case "points_adjusted":
      return "POINTS ADJUSTED";
    case "reward_redeemed":
      return "REWARD REDEEMED";
    case "tier_changed":
      return "TIER CHANGED";
    case "welcome_bonus_granted":
      return "WELCOME BONUS";
    default:
      return type ? type.replaceAll("_", " ").toUpperCase() : "ACTIVITY";
  }
}

function formatPointsDelta(value: unknown) {
  const number = toNumber(value);

  if (number === 0) return "0 PTS";

  const prefix = number > 0 ? "+" : "";

  return `${prefix}${number.toLocaleString()} PTS`;
}

function pointsDeltaClasses(value: unknown) {
  const number = toNumber(value);

  if (number > 0) {
    return "text-emerald-200";
  }

  if (number < 0) {
    return "text-fuchsia-200";
  }

  return "text-slate-300";
}

function getRedemptionState(member: MemberWallet) {
  const redeemed = toNumber(member.lifetimePointsRedeemed);
  const earned = getLifetimeEarned(member);

  if (redeemed > 0) return "ACTIVE";
  if (earned > 0) return "STACKING";
  return "NONE";
}

function getEngagementSignal(member: MemberWallet) {
  const visits = toNumber(member.totalVisits);
  const pointsBalance = toNumber(member.pointsBalance);
  const earned = getLifetimeEarned(member);

  if (visits >= 10 || earned >= 1000) return "STRONG";
  if (visits > 0 || earned > 0 || pointsBalance > 0) return "RETURNING";
  return "NEW";
}

function getAdminRead(member: MemberWallet) {
  const balance = toNumber(member.pointsBalance);
  const redeemed = toNumber(member.lifetimePointsRedeemed);
  const earned = getLifetimeEarned(member);

  if (balance >= 500 && redeemed <= 0) return "REWARD READY";
  if (earned > 0 && redeemed <= 0) return "DRIVE REDEMPTION";
  if (redeemed > 0) return "STRENGTHEN LOOP";
  return "WATCH";
}

function postureToneClasses(value: string) {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("strong") ||
    normalized.includes("active") ||
    normalized.includes("strengthen")
  ) {
    return "border-emerald-300/50 bg-emerald-500/10 text-emerald-100";
  }

  if (
    normalized.includes("returning") ||
    normalized.includes("stacking") ||
    normalized.includes("ready") ||
    normalized.includes("drive")
  ) {
    return "border-cyan-300/50 bg-cyan-500/10 text-cyan-100";
  }

  if (normalized.includes("watch")) {
    return "border-amber-300/50 bg-amber-500/10 text-amber-100";
  }

  return "border-slate-700 bg-slate-950/70 text-slate-100";
}

export default function RewardCircleMemberDetailPage() {
  const { orgId, memberId } = useParams<{
    orgId: string;
    memberId: string;
  }>();

  const [member, setMember] = useState<MemberWallet | null>(null);
  const [activity, setActivity] = useState<RewardCircleActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const basePath = useMemo(() => {
    if (!orgId) return "";
    return `/orgs/${orgId}/growth/reward-circle`;
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !memberId) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/orgs/${orgId}/growth/reward-circle/members/${memberId}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = (await res.json().catch(() => ({}))) as
          | (MemberDetailResponse & { error?: string })
          | { error?: string };

        if (!alive) return;

        if (!res.ok) {
          throw new Error(
            data?.error ||
              `Failed to load RewardCircle member wallet (HTTP ${res.status}).`,
          );
        }

        const payload = data as MemberDetailResponse;

        setMember(payload.member ?? null);
        setActivity(payload.activity ?? []);
      } catch (err: any) {
        console.error("[rewardcircle:member-detail-page] error:", err);

        if (!alive) return;

        setError(err?.message || "Failed to load RewardCircle member wallet.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [orgId, memberId]);

  const walletStatus = member ? getStatusLabel(member) : "unknown";
  const tier = member ? getTierLabel(member) : "Starter";
  const redemptionState = member ? getRedemptionState(member) : "UNKNOWN";
  const engagementSignal = member ? getEngagementSignal(member) : "UNKNOWN";
  const adminRead = member ? getAdminRead(member) : "UNKNOWN";

  if (loading && !member) {
    return (
      <section className="space-y-5">
        <div className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/90 p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)] sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-300/80">
            NeonHQ · Growth Layer · RewardCircle
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.04em] text-slate-50 sm:text-5xl">
            Member Wallet
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Loading RewardCircle member wallet…
          </p>
        </div>

        <RewardCircleAdminTabs />
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-5">
        <div className="rounded-[2rem] border border-red-500/40 bg-red-500/10 p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-red-200/80">
            NeonHQ · Growth Layer · RewardCircle
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.04em] text-slate-50 sm:text-5xl">
            Member Wallet
          </h1>
          <p className="mt-3 text-sm text-red-200">{error}</p>

          {basePath && (
            <Link
              href={`${basePath}/members`}
              className="mt-5 inline-flex rounded-full border border-red-300/40 bg-red-400/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-red-100 hover:bg-red-300 hover:text-slate-950"
            >
              Back to Members
            </Link>
          )}
        </div>

        <RewardCircleAdminTabs />
      </section>
    );
  }

  if (!member) {
    return (
      <section className="space-y-5">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/90 p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">
            NeonHQ · Growth Layer · RewardCircle
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.04em] text-slate-50 sm:text-5xl">
            Member Wallet
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            No RewardCircle member wallet was found for this member.
          </p>

          {basePath && (
            <Link
              href={`${basePath}/members`}
              className="mt-5 inline-flex rounded-full border border-cyan-300/40 bg-cyan-400/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-cyan-100 hover:bg-cyan-300 hover:text-slate-950"
            >
              Back to Members
            </Link>
          )}
        </div>

        <RewardCircleAdminTabs />
      </section>
    );
  }

  const resolvedMemberId = getMemberId(member) || memberId;

  return (
    <section className="space-y-8">
      <header className="space-y-5">
        <div className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/90 p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)] sm:p-8">
          <div className="mb-5">
            <Link
              href={`${basePath}/members`}
              className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300 hover:text-cyan-100"
            >
              ← Back to Member Wallets
            </Link>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-300/80">
                NeonHQ · Growth Layer · RewardCircle
              </p>

              <div className="space-y-3">
                <h1 className="text-4xl font-black uppercase tracking-[-0.04em] text-slate-50 sm:text-5xl lg:text-6xl">
                  Member
                  <span className="block bg-gradient-to-r from-cyan-300 via-emerald-300 to-fuchsia-300 bg-clip-text text-transparent">
                    Wallet
                  </span>
                </h1>

                <p className="text-2xl font-black tracking-[-0.03em] text-slate-50 sm:text-3xl">
                  {getDisplayName(member)}
                </p>

                <p className="max-w-3xl text-sm font-medium uppercase leading-6 tracking-[0.16em] text-slate-300">
                  RewardCircle loyalty state, stored value, tier posture, and
                  activity history for this member.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <span
                className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${statusClasses(
                  walletStatus,
                )}`}
              >
                {walletStatus}
              </span>

              <span
                className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${tierClasses(
                  tier,
                )}`}
              >
                {tier}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm text-slate-400 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Phone
              </p>
              <p className="mt-2 text-slate-200">{member.phone || "—"}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Email
              </p>
              <p className="mt-2 text-slate-200">{member.email || "—"}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Member ID
              </p>
              <p className="mt-2 truncate text-slate-200">
                {resolvedMemberId || "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Joined
              </p>
              <p className="mt-2 text-slate-200">
                {formatDate(member.joinedAt)}
              </p>
            </div>
          </div>
        </div>

        <RewardCircleAdminTabs />
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.5rem] border border-cyan-400/40 bg-cyan-500/10 p-5 shadow-[0_0_28px_rgba(34,211,238,0.08)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Points Balance
          </p>
          <p className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-50">
            {formatNumber(member.pointsBalance)}
          </p>
          <p className="mt-3 text-sm leading-5 text-slate-400">
            Stored value available in this wallet.
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-emerald-400/40 bg-emerald-500/10 p-5 shadow-[0_0_28px_rgba(16,185,129,0.08)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Lifetime Earned
          </p>
          <p className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-50">
            {formatNumber(getLifetimeEarned(member))}
          </p>
          <p className="mt-3 text-sm leading-5 text-slate-400">
            Total value this member has earned.
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-fuchsia-400/40 bg-fuchsia-500/10 p-5 shadow-[0_0_28px_rgba(217,70,239,0.08)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Lifetime Redeemed
          </p>
          <p className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-50">
            {formatNumber(member.lifetimePointsRedeemed)}
          </p>
          <p className="mt-3 text-sm leading-5 text-slate-400">
            Points converted into reward value.
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-slate-400/30 bg-slate-400/10 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Current Tier
          </p>
          <p className="mt-4 text-4xl font-black uppercase tracking-[-0.04em] text-slate-50">
            {tier}
          </p>
          <p className="mt-3 text-sm leading-5 text-slate-400">
            Present RewardCircle tier position.
          </p>
        </article>
      </div>

      <section className="grid gap-4 lg:grid-cols-4">
        <article
          className={`rounded-[1.5rem] border p-5 ${postureToneClasses(
            walletStatus,
          )}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Wallet Status
          </p>
          <p className="mt-4 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
            {walletStatus}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Current RewardCircle wallet availability.
          </p>
        </article>

        <article
          className={`rounded-[1.5rem] border p-5 ${postureToneClasses(
            redemptionState,
          )}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Redemption State
          </p>
          <p className="mt-4 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
            {redemptionState}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Shows whether this member is only stacking or redeeming value.
          </p>
        </article>

        <article
          className={`rounded-[1.5rem] border p-5 ${postureToneClasses(
            engagementSignal,
          )}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Engagement Signal
          </p>
          <p className="mt-4 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
            {engagementSignal}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Reads visits, earned points, balance, and wallet weight.
          </p>
        </article>

        <article
          className={`rounded-[1.5rem] border p-5 ${postureToneClasses(
            adminRead,
          )}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Next Admin Read
          </p>
          <p className="mt-4 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
            {adminRead}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Suggested operational read based on this member’s wallet behavior.
          </p>
        </article>
      </section>

      <section className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-5">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
              Value History
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
              Recent Activity
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Last RewardCircle activity records for this member wallet.
            </p>
          </div>

          <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-2">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em]">
                Visits
              </span>
              <span className="mt-1 block text-slate-300">
                {formatNumber(member.totalVisits)}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-2">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em]">
                Streak
              </span>
              <span className="mt-1 block text-slate-300">
                {formatNumber(member.streakCount)}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-2">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em]">
                Last Activity
              </span>
              <span className="mt-1 block text-slate-300">
                {formatDate(member.lastActivityAt)}
              </span>
            </div>
          </div>
        </div>

        {activity.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <p className="text-sm font-semibold text-slate-200">
              No RewardCircle activity has been recorded for this member yet.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Activity will appear here when this member earns points, redeems
              rewards, changes tiers, or receives adjustments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.18em]">
                    Points
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Reward
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.18em]">
                    Balance After
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Staff
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Note
                  </th>
                </tr>
              </thead>

              <tbody>
                {activity.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-800/80 transition hover:bg-cyan-500/5"
                  >
                    <td className="px-4 py-4 text-slate-400">
                      {formatDate(item.createdAt)}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
                        {formatActivityType(item.type)}
                      </span>
                    </td>

                    <td
                      className={`px-4 py-4 text-right font-black ${pointsDeltaClasses(
                        item.pointsDelta,
                      )}`}
                    >
                      {formatPointsDelta(item.pointsDelta)}
                    </td>

                    <td className="px-4 py-4 text-slate-300">
                      {item.rewardTitle || item.rewardId || "—"}
                    </td>

                    <td className="px-4 py-4 text-right text-slate-300">
                      {item.pointsBalanceAfter === undefined ||
                      item.pointsBalanceAfter === null
                        ? "—"
                        : formatNumber(item.pointsBalanceAfter)}
                    </td>

                    <td className="px-4 py-4 text-slate-400">
                      {item.staffName || item.staffUserId || "—"}
                    </td>

                    <td className="max-w-[260px] px-4 py-4 text-slate-400">
                      <span className="line-clamp-2">
                        {item.note || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}