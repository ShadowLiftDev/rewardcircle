"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RewardCircleAdminTabs } from "@/components/rewardcircle/RewardCircleAdminTabs";

import type {
  RewardCircleActivity,
  RewardCircleActivityType,
} from "@/lib/rewardcircle/types";

type Tone =
  | "cyan"
  | "emerald"
  | "violet"
  | "silver"
  | "strong"
  | "rising"
  | "watch"
  | "soft";

type ActivityResponse = {
  activity?: RewardCircleActivity[];
  error?: string;
};

type ActivityTypeFilter = "all" | RewardCircleActivityType;

const ACTIVITY_TYPES: Array<{
  value: ActivityTypeFilter;
  label: string;
}> = [
  { value: "all", label: "All Activity" },
  { value: "member_joined", label: "Member Joined" },
  { value: "visit_logged", label: "Visit Logged" },
  { value: "points_earned", label: "Points Earned" },
  { value: "points_redeemed", label: "Points Redeemed" },
  { value: "points_adjusted", label: "Points Adjusted" },
  { value: "reward_redeemed", label: "Reward Redeemed" },
  { value: "tier_changed", label: "Tier Changed" },
  { value: "welcome_bonus_granted", label: "Welcome Bonus" },
];

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function toneClasses(tone: Tone | "mixed") {
  switch (tone) {
    case "cyan":
      return "border-cyan-400/40 bg-cyan-500/10 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.08)]";
    case "emerald":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.08)]";
    case "violet":
      return "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-100 shadow-[0_0_28px_rgba(217,70,239,0.08)]";
    case "silver":
      return "border-slate-400/30 bg-slate-400/10 text-slate-100";
    case "strong":
      return "border-emerald-300/50 bg-emerald-500/10 text-emerald-100";
    case "rising":
      return "border-cyan-300/50 bg-cyan-500/10 text-cyan-100";
    case "watch":
      return "border-amber-300/50 bg-amber-500/10 text-amber-100";
    case "mixed":
      return "border-cyan-300/40 bg-gradient-to-br from-cyan-500/10 via-fuchsia-500/10 to-emerald-500/10 text-slate-100";
    case "soft":
    default:
      return "border-slate-700 bg-slate-950/70 text-slate-100";
  }
}

function formatNumber(value: unknown) {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n)) return "0";

  return n.toLocaleString();
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

function activityTone(type: string): Tone {
  switch (type) {
    case "points_earned":
    case "welcome_bonus_granted":
    case "visit_logged":
      return "emerald";
    case "reward_redeemed":
    case "points_redeemed":
      return "violet";
    case "tier_changed":
      return "cyan";
    case "points_adjusted":
      return "watch";
    case "member_joined":
      return "rising";
    default:
      return "soft";
  }
}

function activityBadgeClass(type: string) {
  const tone = activityTone(type);

  if (tone === "emerald") {
    return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  }

  if (tone === "violet") {
    return "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200";
  }

  if (tone === "cyan" || tone === "rising") {
    return "border-cyan-400/40 bg-cyan-500/10 text-cyan-200";
  }

  if (tone === "watch") {
    return "border-amber-400/40 bg-amber-500/10 text-amber-200";
  }

  return "border-slate-600 bg-slate-800/50 text-slate-300";
}

function formatPointsDelta(value: unknown) {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n) || n === 0) return "0 PTS";

  const prefix = n > 0 ? "+" : "";

  return `${prefix}${n.toLocaleString()} PTS`;
}

function pointsDeltaClass(value: unknown) {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n) || n === 0) return "text-slate-300";
  if (n > 0) return "text-emerald-200";

  return "text-fuchsia-200";
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

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  ) {
    return new Date(
      (value as { seconds: number }).seconds * 1000,
    ).toLocaleString();
  }

  return "—";
}

function tierMovement(activity: RewardCircleActivity) {
  if (!activity.previousTier && !activity.newTier) return "—";
  if (!activity.previousTier) return activity.newTier ?? "—";
  if (!activity.newTier) return activity.previousTier;

  return `${activity.previousTier} → ${activity.newTier}`;
}

function searchBlob(activity: RewardCircleActivity) {
  return [
    activity.type,
    activity.memberId,
    activity.rewardId,
    activity.rewardTitle,
    activity.staffUserId,
    activity.staffName,
    activity.note,
    activity.previousTier,
    activity.newTier,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function RewardCircleActivityPage() {
  const params = useParams();
  const orgId = readParam(params?.orgId as string | string[] | undefined);

  const base = `/orgs/${orgId}/growth/reward-circle`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activity, setActivity] = useState<RewardCircleActivity[]>([]);
  const [count, setCount] = useState(50);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>("all");

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      setError("Missing orgId.");
      return;
    }

    let alive = true;

    async function loadActivity() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/orgs/${orgId}/growth/reward-circle/activity?count=${count}`,
          {
            cache: "no-store",
          },
        );

        const data = (await res.json().catch(() => ({}))) as ActivityResponse;

        if (!alive) return;

        if (!res.ok) {
          throw new Error(
            data?.error || "Failed to load RewardCircle activity.",
          );
        }

        setActivity(Array.isArray(data.activity) ? data.activity : []);
      } catch (err: any) {
        console.error("[RewardCircleActivityPage] load error:", err);

        if (!alive) return;

        setError(err?.message || "Failed to load RewardCircle activity.");
        setActivity([]);
      } finally {
        if (!alive) return;

        setLoading(false);
      }
    }

    loadActivity();

    return () => {
      alive = false;
    };
  }, [orgId, count]);

  const filteredActivity = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activity.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (!query) return true;

      return searchBlob(item).includes(query);
    });
  }, [activity, search, typeFilter]);

  const stats = useMemo(() => {
    const totalEvents = activity.length;

    const pointsEarned = activity.reduce((sum, item) => {
      const delta = Number(item.pointsDelta ?? 0);

      if (!Number.isFinite(delta) || delta <= 0) return sum;

      return sum + delta;
    }, 0);

    const pointsSpent = activity.reduce((sum, item) => {
      const delta = Number(item.pointsDelta ?? 0);

      if (!Number.isFinite(delta) || delta >= 0) return sum;

      return sum + Math.abs(delta);
    }, 0);

    const rewardRedemptions = activity.filter(
      (item) => item.type === "reward_redeemed",
    ).length;

    return [
      {
        label: "Total Events",
        value: formatNumber(totalEvents),
        hint: "RewardCircle activity records loaded for this org.",
        tone: "cyan" as Tone,
      },
      {
        label: "Points Earned",
        value: `${formatNumber(pointsEarned)} PTS`,
        hint: "Positive value movement recorded in recent activity.",
        tone: "emerald" as Tone,
      },
      {
        label: "Points Spent",
        value: `${formatNumber(pointsSpent)} PTS`,
        hint: "Points converted into redemption or value movement.",
        tone: "violet" as Tone,
      },
      {
        label: "Reward Redemptions",
        value: formatNumber(rewardRedemptions),
        hint: "Reward redemption events found in the current view.",
        tone: "silver" as Tone,
      },
    ];
  }, [activity]);

  return (
    <section className="space-y-8">
      <header className="space-y-5">
        <div className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/90 p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-300/80">
                NeonHQ · Growth Layer · RewardCircle
              </p>

              <div className="space-y-3">
                <h1 className="text-4xl font-black uppercase tracking-[-0.04em] text-slate-50 sm:text-5xl lg:text-6xl">
                  Value
                  <span className="block bg-gradient-to-r from-cyan-300 via-emerald-300 to-fuchsia-300 bg-clip-text text-transparent">
                    History
                  </span>
                </h1>

                <p className="max-w-3xl text-sm font-medium uppercase leading-6 tracking-[0.16em] text-slate-300 sm:text-base">
                  Trace how points, rewards, staff actions, and member momentum
                  move through the RewardCircle loop.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`${base}/rewards`}
                className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 hover:bg-emerald-300 hover:text-slate-950"
              >
                Reward Shop
              </Link>

              <Link
                href={`${base}/settings`}
                className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-cyan-100 hover:bg-cyan-300 hover:text-slate-950"
              >
                Program Rules
              </Link>

              <Link
                href={`${base}/members`}
                className="rounded-full border border-fuchsia-300/40 bg-fuchsia-400/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-100 hover:bg-fuchsia-300 hover:text-slate-950"
              >
                Member Wallets
              </Link>
            </div>
          </div>
        </div>

        <RewardCircleAdminTabs />
      </header>

      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className={`rounded-[1.5rem] border p-5 ${toneClasses(stat.tone)}`}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              {stat.label}
            </p>

            <p className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-50">
              {stat.value}
            </p>

            <p className="mt-3 text-sm leading-5 text-slate-400">
              {stat.hint}
            </p>
          </article>
        ))}
      </div>

      <section className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-5">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
              Activity Feed
            </p>

            <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
              RewardCircle Events
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              A read-only view of earned value, redemptions, staff actions, tier
              movement, and member wallet history.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[680px]">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Search
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Member, reward, staff, note..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Activity Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as ActivityTypeFilter)
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              >
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Load Count
              </label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              >
                <option value={25}>25 Events</option>
                <option value={50}>50 Events</option>
                <option value={100}>100 Events</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
            {loading
              ? "Loading Activity"
              : `${formatNumber(filteredActivity.length)} Visible Events`}
          </p>

          {(search || typeFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTypeFilter("all");
              }}
              className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300 hover:text-cyan-100"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/70 text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                  Activity
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                  Member
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                  Points
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                  Balance After
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                  Reward / Tier
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
              {filteredActivity.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-800/70 last:border-0"
                >
                  <td className="whitespace-nowrap px-4 py-4 align-top text-xs text-slate-400">
                    {formatDate(item.createdAt)}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${activityBadgeClass(
                        item.type,
                      )}`}
                    >
                      {formatActivityType(item.type)}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-top">
                    {item.memberId ? (
                      <Link
                        href={`${base}/members/${item.memberId}`}
                        className="font-bold text-cyan-200 hover:text-cyan-100"
                      >
                        {item.memberId}
                      </Link>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <span
                      className={`font-black ${pointsDeltaClass(
                        item.pointsDelta,
                      )}`}
                    >
                      {formatPointsDelta(item.pointsDelta)}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-top text-slate-300">
                    {item.pointsBalanceAfter != null
                      ? `${formatNumber(item.pointsBalanceAfter)} PTS`
                      : "—"}
                  </td>

                  <td className="px-4 py-4 align-top">
                    {item.type === "tier_changed" ? (
                      <div>
                        <p className="font-bold text-slate-100">
                          {tierMovement(item)}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          Tier Movement
                        </p>
                      </div>
                    ) : item.rewardTitle || item.rewardId ? (
                      <div>
                        <p className="font-bold text-slate-100">
                          {item.rewardTitle || item.rewardId}
                        </p>
                        {item.rewardPointsCost != null && (
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            {formatNumber(item.rewardPointsCost)} PTS Cost
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  <td className="px-4 py-4 align-top">
                    {item.staffName || item.staffUserId ? (
                      <div>
                        <p className="font-bold text-slate-100">
                          {item.staffName || "Staff User"}
                        </p>
                        {item.staffUserId && (
                          <p className="mt-1 max-w-44 truncate text-[10px] text-slate-500">
                            {item.staffUserId}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  <td className="max-w-sm px-4 py-4 align-top text-sm leading-6 text-slate-400">
                    {item.note || "—"}
                  </td>
                </tr>
              ))}

              {!loading && filteredActivity.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    No RewardCircle activity matches the current view.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    Loading RewardCircle activity...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className={`rounded-[1.5rem] border p-5 ${toneClasses("soft")}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Activity Doctrine
          </p>
          <h3 className="mt-4 text-xl font-black uppercase tracking-[-0.03em] text-slate-50">
            Activity Replaces Transactions
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            RewardCircle activity is the history of earned value, not a cold
            financial ledger.
          </p>
        </article>

        <article
          className={`rounded-[1.5rem] border p-5 ${toneClasses("rising")}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Value Movement
          </p>
          <h3 className="mt-4 text-xl font-black uppercase tracking-[-0.03em] text-slate-50">
            Points Explain Memory
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Every point movement should explain why value entered or left a
            member wallet.
          </p>
        </article>

        <article className={`rounded-[1.5rem] border p-5 ${toneClasses("watch")}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Admin Note
          </p>
          <h3 className="mt-4 text-xl font-black uppercase tracking-[-0.03em] text-slate-50">
            Read-Only Surface
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            This page shows history. Staff actions and redemption controls should
            happen through staff routes and operational screens.
          </p>
        </article>
      </section>
    </section>
  );
}