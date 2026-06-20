"use client";

import Link from "next/link";
import { RewardCircleAdminTabs } from "@/components/rewardcircle/RewardCircleAdminTabs";

type Tone =
  | "cyan"
  | "emerald"
  | "violet"
  | "silver"
  | "strong"
  | "rising"
  | "watch"
  | "soft";

export type RewardCircleDashboardPageData = {
  orgId: string;
  heroSummary: string;
  topStats: Array<{
    label: string;
    value: string;
    hint: string;
    tone: Tone;
  }>;
  commandCards: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    tone: Tone | "mixed";
    tags: string[];
  }>;
  systemCards: Array<{
    id: string;
    label: string;
    value: string;
    tone: Tone;
    summary: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    memberId?: string;
    memberName?: string;
    pointsDelta?: number;
    rewardTitle?: string;
    staffName?: string;
    createdAt?: string | number | Date | null;
  }>;
  memberPreview: Array<{
    memberId: string;
    displayName: string;
    phone?: string;
    pointsBalance: number;
    lifetimePointsEarned: number;
    lifetimePointsRedeemed: number;
    currentTier: string;
    currentTierName?: string;
  }>;
};

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
  const n = Number(value ?? 0);

  if (!Number.isFinite(n) || n === 0) return "0 PTS";

  const prefix = n > 0 ? "+" : "";

  return `${prefix}${n.toLocaleString()} PTS`;
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

function formatNumber(value: unknown) {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n)) return "0";

  return n.toLocaleString();
}

export default function RewardCircleDashboardClient({
  data,
}: {
  data: RewardCircleDashboardPageData;
}) {
  const base = `/orgs/${data.orgId}/growth/reward-circle`;

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
                  RewardCircle
                  <span className="block bg-gradient-to-r from-cyan-300 via-emerald-300 to-fuchsia-300 bg-clip-text text-transparent">
                    Value Engine
                  </span>
                </h1>

                <p className="max-w-3xl text-sm font-medium uppercase leading-6 tracking-[0.16em] text-slate-300 sm:text-base">
                  {data.heroSummary}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`${base}/settings`}
                className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-cyan-100 hover:bg-cyan-300 hover:text-slate-950"
              >
                Program Rules
              </Link>

              <Link
                href={`${base}/rewards`}
                className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 hover:bg-emerald-300 hover:text-slate-950"
              >
                Reward Shop
              </Link>
            </div>
          </div>
        </div>

        <RewardCircleAdminTabs />
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.topStats.map((stat) => (
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

      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            Command Paths
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
            Control the Reward Loop
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {data.commandCards.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className={`group rounded-[1.5rem] border p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/70 ${toneClasses(
                card.tone,
              )}`}
            >
              <div className="flex flex-wrap gap-2">
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h3 className="mt-5 text-xl font-black uppercase tracking-[-0.03em] text-slate-50">
                {card.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {card.description}
              </p>

              <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300 group-hover:text-cyan-100">
                Open Control →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {data.systemCards.map((card) => (
          <article
            key={card.id}
            className={`rounded-[1.5rem] border p-5 ${toneClasses(card.tone)}`}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              {card.label}
            </p>

            <p className="mt-4 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
              {card.value}
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {card.summary}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
                Value History
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
                Recent Activity
              </h2>
            </div>

            <Link
              href={`${base}/activity`}
              className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300 hover:text-cyan-100"
            >
              View All →
            </Link>
          </div>

          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-400">
              No RewardCircle activity has been recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                        {formatActivityType(item.type)}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        {item.memberName || item.memberId || "RewardCircle Member"}
                        {item.rewardTitle ? ` · ${item.rewardTitle}` : ""}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-black text-slate-50">
                        {formatPointsDelta(item.pointsDelta)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </div>

                  {item.staffName && (
                    <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      Staff: {item.staffName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fuchsia-300/80">
                Member Wallets
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
                Wallet Preview
              </h2>
            </div>

            <Link
              href={`${base}/members`}
              className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300 hover:text-cyan-100"
            >
              View All →
            </Link>
          </div>

          {data.memberPreview.length === 0 ? (
            <p className="text-sm text-slate-400">
              No RewardCircle member wallets have been created yet.
            </p>
          ) : (
            <div className="space-y-3">
              {data.memberPreview.map((member) => (
                <Link
                  key={member.memberId}
                  href={`${base}/members/${member.memberId}`}
                  className="block rounded-2xl border border-slate-800 bg-slate-900/40 p-4 transition hover:border-cyan-400/60 hover:bg-slate-900/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-50">
                        {member.displayName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {member.phone || "No phone on file"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-200">
                        {formatNumber(member.pointsBalance)}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Points
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
                      {member.currentTierName || member.currentTier}
                    </span>

                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                      {formatNumber(member.lifetimePointsEarned)} Earned
                    </span>

                    <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-fuchsia-200">
                      {formatNumber(member.lifetimePointsRedeemed)} Redeemed
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}