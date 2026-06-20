"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RewardCircleAdminTabs } from "@/components/rewardcircle/RewardCircleAdminTabs";

type MemberWalletRow = {
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

  lastActivityAt?: string | number | Date | null;
};

type MembersResponse = {
  members?: MemberWalletRow[];
};

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function formatNumber(value: unknown) {
  return toNumber(value).toLocaleString();
}

function formatDate(value: MemberWalletRow["lastActivityAt"]) {
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

function getMemberId(member: MemberWalletRow) {
  return String(member.memberId || member.id || "").trim();
}

function getDisplayName(member: MemberWalletRow) {
  return member.displayName || member.name || "RewardCircle Member";
}

function getLifetimeEarned(member: MemberWalletRow) {
  return toNumber(member.lifetimePointsEarned ?? member.lifetimePoints);
}

function getTierLabel(member: MemberWalletRow) {
  return member.currentTierName || member.currentTier || "Starter";
}

function getStatusLabel(member: MemberWalletRow) {
  return member.status || "active";
}

function matchesSearch(member: MemberWalletRow, query: string) {
  const needle = query.trim().toLowerCase();

  if (!needle) return true;

  const haystack = [
    getMemberId(member),
    getDisplayName(member),
    member.phone,
    member.email,
    member.status,
    member.currentTier,
    member.currentTierName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
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

export default function RewardCircleMembersPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();

  const [members, setMembers] = useState<MemberWalletRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const basePath = useMemo(() => {
    if (!orgId) return "";
    return `/orgs/${orgId}/growth/reward-circle`;
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/orgs/${orgId}/growth/reward-circle/members`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = (await res.json().catch(() => ({}))) as MembersResponse & {
        error?: string;
        };

        if (!alive) return;

        if (!res.ok) {
          throw new Error(
            data?.error || `Failed to load member wallets (HTTP ${res.status}).`,
          );
        }

        setMembers(data.members ?? []);
      } catch (err: any) {
        console.error("[rewardcircle:members-page] error:", err);

        if (!alive) return;

        setError(err?.message || "Failed to load RewardCircle member wallets.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [orgId]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => matchesSearch(member, query));
  }, [members, query]);

  const summary = useMemo(() => {
    const totalMembers = members.length;

    const activeWallets = members.filter(
      (member) => getStatusLabel(member).toLowerCase() === "active",
    ).length;

    const pointsInCirculation = members.reduce(
      (sum, member) => sum + toNumber(member.pointsBalance),
      0,
    );

    const pointsRedeemed = members.reduce(
      (sum, member) => sum + toNumber(member.lifetimePointsRedeemed),
      0,
    );

    return {
      totalMembers,
      activeWallets,
      pointsInCirculation,
      pointsRedeemed,
    };
  }, [members]);

  function openMember(member: MemberWalletRow) {
    const memberId = getMemberId(member);

    if (!memberId || !basePath) return;

    router.push(`${basePath}/members/${memberId}`);
  }

  return (
    <section className="space-y-8">
      <header className="space-y-5">
        <div className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/90 p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-300/80">
                NeonHQ · Growth Layer · RewardCircle
              </p>

              <div className="space-y-3">
                <h1 className="text-4xl font-black uppercase tracking-[-0.04em] text-slate-50 sm:text-5xl">
                  Member
                  <span className="block bg-gradient-to-r from-cyan-300 via-emerald-300 to-fuchsia-300 bg-clip-text text-transparent">
                    Wallets
                  </span>
                </h1>

                <p className="max-w-3xl text-sm font-medium uppercase leading-6 tracking-[0.16em] text-slate-300">
                  Review RewardCircle members, points balances, tiers,
                  redemption weight, and loyalty state from one admin control
                  surface.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Wallet Search
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Find members by name, phone, email, tier, or status.
              </p>
            </div>
          </div>
        </div>

        <RewardCircleAdminTabs />
      </header>

      {error && (
        <div className="rounded-[1.5rem] border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.5rem] border border-cyan-400/40 bg-cyan-500/10 p-5 shadow-[0_0_28px_rgba(34,211,238,0.08)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Total Members
          </p>
          <p className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-50">
            {formatNumber(summary.totalMembers)}
          </p>
          <p className="mt-3 text-sm leading-5 text-slate-400">
            Wallets currently visible in RewardCircle.
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-emerald-400/40 bg-emerald-500/10 p-5 shadow-[0_0_28px_rgba(16,185,129,0.08)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Active Wallets
          </p>
          <p className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-50">
            {formatNumber(summary.activeWallets)}
          </p>
          <p className="mt-3 text-sm leading-5 text-slate-400">
            Members currently marked active.
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-fuchsia-400/40 bg-fuchsia-500/10 p-5 shadow-[0_0_28px_rgba(217,70,239,0.08)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Points In Circulation
          </p>
          <p className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-50">
            {formatNumber(summary.pointsInCirculation)}
          </p>
          <p className="mt-3 text-sm leading-5 text-slate-400">
            Current stored value across member wallets.
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-slate-400/30 bg-slate-400/10 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Points Redeemed
          </p>
          <p className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-50">
            {formatNumber(summary.pointsRedeemed)}
          </p>
          <p className="mt-3 text-sm leading-5 text-slate-400">
            Value already converted into rewards.
          </p>
        </article>
      </div>

      <section className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-5">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
              Wallet Index
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
              RewardCircle Members
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Scan the member base, compare stored value, and open individual
              wallet records.
            </p>
          </div>

          <div className="w-full max-w-md">
            <label
              htmlFor="member-search"
              className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500"
            >
              Search Wallets
            </label>
            <input
              id="member-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, phone, email, tier..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">
            Loading RewardCircle member wallets…
          </p>
        ) : filteredMembers.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <p className="text-sm font-semibold text-slate-200">
              No RewardCircle member wallets found.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Members are created when staff locate a guest by phone, award
              points, or complete RewardCircle actions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Member
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Tier
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.18em]">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.18em]">
                    Earned
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.18em]">
                    Redeemed
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Last Activity
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredMembers.map((member) => {
                  const memberId = getMemberId(member);
                  const status = getStatusLabel(member);
                  const tier = getTierLabel(member);

                  return (
                    <tr
                      key={memberId || member.phone || getDisplayName(member)}
                      onClick={() => openMember(member)}
                      className="cursor-pointer border-t border-slate-800/80 transition hover:bg-cyan-500/5"
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-slate-50">
                            {getDisplayName(member)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {memberId || "No member id"}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="text-slate-300">
                            {member.phone || "—"}
                          </p>
                          {member.email && (
                            <p className="text-xs text-slate-500">
                              {member.email}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${statusClasses(
                            status,
                          )}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tierClasses(
                            tier,
                          )}`}
                        >
                          {tier}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <p className="text-lg font-black text-emerald-200">
                          {formatNumber(member.pointsBalance)}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right text-slate-300">
                        {formatNumber(getLifetimeEarned(member))}
                      </td>

                      <td className="px-4 py-4 text-right text-slate-300">
                        {formatNumber(member.lifetimePointsRedeemed)}
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {formatDate(member.lastActivityAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}