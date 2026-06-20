"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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

type RewardStatus = "draft" | "active" | "inactive" | "archived";

type RewardRow = {
  rewardId: string;
  orgId?: string;

  title: string;
  description?: string;

  pointsCost: number;

  status: RewardStatus;

  isPublic: boolean;
  isFeatured: boolean;

  category?: string;
  imageUrl?: string;

  redemptionInstructions?: string;
  internalNotes?: string;

  sortOrder?: number;

  startsAt?: unknown;
  endsAt?: unknown;

  createdAt?: unknown;
  updatedAt?: unknown;
};

type RewardsResponse = {
  rewards?: RewardRow[];
  error?: string;
};

type RewardMutationResponse = {
  ok?: boolean;
  reward?: RewardRow;
  error?: string;
};

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

function normalizeStatus(value: unknown): RewardStatus {
  const status = String(value ?? "").trim().toLowerCase();

  if (
    status === "draft" ||
    status === "active" ||
    status === "inactive" ||
    status === "archived"
  ) {
    return status;
  }

  return "active";
}

function normalizeReward(raw: any): RewardRow {
  return {
    rewardId: String(raw?.rewardId ?? raw?.id ?? "").trim(),
    orgId: raw?.orgId,

    title: String(raw?.title ?? raw?.name ?? "Reward").trim(),
    description: raw?.description ?? "",

    pointsCost:
      typeof raw?.pointsCost === "number" && Number.isFinite(raw.pointsCost)
        ? raw.pointsCost
        : 0,

    status: normalizeStatus(
      raw?.status ?? (raw?.active === false ? "inactive" : "active"),
    ),

    isPublic: raw?.isPublic !== false,
    isFeatured: raw?.isFeatured === true,

    category: raw?.category ?? "",
    imageUrl: raw?.imageUrl ?? "",

    redemptionInstructions: raw?.redemptionInstructions ?? "",
    internalNotes: raw?.internalNotes ?? "",

    sortOrder:
      typeof raw?.sortOrder === "number" && Number.isFinite(raw.sortOrder)
        ? raw.sortOrder
        : 0,

    startsAt: raw?.startsAt,
    endsAt: raw?.endsAt,

    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

function statusLabel(status: RewardStatus) {
  switch (status) {
    case "active":
      return "Active";
    case "draft":
      return "Draft";
    case "inactive":
      return "Inactive";
    case "archived":
      return "Archived";
    default:
      return "Active";
  }
}

function statusBadgeClass(status: RewardStatus) {
  switch (status) {
    case "active":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
    case "draft":
      return "border-amber-400/40 bg-amber-500/10 text-amber-200";
    case "inactive":
      return "border-cyan-400/30 bg-cyan-500/10 text-cyan-200";
    case "archived":
    default:
      return "border-slate-500/50 bg-slate-700/30 text-slate-300";
  }
}

function formatNumber(value: unknown) {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n)) return "0";

  return n.toLocaleString();
}

function averagePointCost(rewards: RewardRow[]) {
  const priced = rewards.filter((reward) => reward.pointsCost > 0);

  if (priced.length === 0) return 0;

  return Math.round(
    priced.reduce((sum, reward) => sum + reward.pointsCost, 0) / priced.length,
  );
}

export default function RewardCircleRewardsPage() {
  const params = useParams();
  const orgId = readParam(params?.orgId as string | string[] | undefined);

  const base = `/orgs/${orgId}/growth/reward-circle`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [rewards, setRewards] = useState<RewardRow[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [titleInput, setTitleInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [pointsCostInput, setPointsCostInput] = useState("100");
  const [categoryInput, setCategoryInput] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [sortOrderInput, setSortOrderInput] = useState("0");

  const [statusInput, setStatusInput] = useState<RewardStatus>("active");
  const [isPublicInput, setIsPublicInput] = useState(true);
  const [isFeaturedInput, setIsFeaturedInput] = useState(false);

  const [redemptionInstructionsInput, setRedemptionInstructionsInput] =
    useState("");
  const [internalNotesInput, setInternalNotesInput] = useState("");

  const sortedRewards = useMemo(() => {
    return [...rewards].sort((a, b) => {
      const sortA = Number(a.sortOrder ?? 0);
      const sortB = Number(b.sortOrder ?? 0);

      if (sortA !== sortB) return sortA - sortB;

      return a.title.localeCompare(b.title);
    });
  }, [rewards]);

  const stats = useMemo(() => {
    const totalRewards = rewards.length;
    const activeRewards = rewards.filter(
      (reward) => reward.status === "active",
    ).length;
    const publicRewards = rewards.filter(
      (reward) => reward.status === "active" && reward.isPublic,
    ).length;
    const featuredRewards = rewards.filter(
      (reward) => reward.status === "active" && reward.isFeatured,
    ).length;
    const averageCost = averagePointCost(rewards);

    return [
      {
        label: "Total Rewards",
        value: formatNumber(totalRewards),
        hint: "All reward objects currently configured in the shop catalog.",
        tone: "cyan" as Tone,
      },
      {
        label: "Active Rewards",
        value: formatNumber(activeRewards),
        hint: "Rewards that can currently support the loyalty value loop.",
        tone: "emerald" as Tone,
      },
      {
        label: "Public Shop Items",
        value: formatNumber(publicRewards),
        hint: "Active rewards visible to customers in the RewardCircle shop.",
        tone: "violet" as Tone,
      },
      {
        label: "Average Cost",
        value: `${formatNumber(averageCost)} PTS`,
        hint: "Average point pressure across the current reward catalog.",
        tone: "silver" as Tone,
      },
    ];
  }, [rewards]);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      setError("Missing orgId.");
      return;
    }

    let alive = true;

    async function loadRewards() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/orgs/${orgId}/growth/reward-circle/rewards`,
          {
            cache: "no-store",
          },
        );

        const data = (await res.json().catch(() => ({}))) as RewardsResponse;

        if (!alive) return;

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load RewardCircle rewards.");
        }

        const list = Array.isArray(data.rewards)
          ? data.rewards.map(normalizeReward)
          : [];

        setRewards(list);
      } catch (err: any) {
        console.error("[RewardCircleRewardsPage] load error:", err);

        if (!alive) return;

        setError(err?.message || "Failed to load RewardCircle rewards.");
      } finally {
        if (!alive) return;

        setLoading(false);
      }
    }

    loadRewards();

    return () => {
      alive = false;
    };
  }, [orgId]);

  function resetForm() {
    const nextSortOrder =
      sortedRewards.length > 0
        ? Number(sortedRewards[sortedRewards.length - 1]?.sortOrder ?? 0) + 10
        : 10;

    setEditingId(null);

    setTitleInput("");
    setDescriptionInput("");
    setPointsCostInput("100");
    setCategoryInput("");
    setImageUrlInput("");
    setSortOrderInput(String(nextSortOrder));

    setStatusInput("active");
    setIsPublicInput(true);
    setIsFeaturedInput(false);

    setRedemptionInstructionsInput("");
    setInternalNotesInput("");

    setError(null);
    setSuccess(null);
  }

  function startEdit(reward: RewardRow) {
    setEditingId(reward.rewardId);

    setTitleInput(reward.title);
    setDescriptionInput(reward.description ?? "");
    setPointsCostInput(String(reward.pointsCost ?? 0));
    setCategoryInput(reward.category ?? "");
    setImageUrlInput(reward.imageUrl ?? "");
    setSortOrderInput(String(reward.sortOrder ?? 0));

    setStatusInput(reward.status);
    setIsPublicInput(reward.isPublic !== false);
    setIsFeaturedInput(reward.isFeatured === true);

    setRedemptionInstructionsInput(reward.redemptionInstructions ?? "");
    setInternalNotesInput(reward.internalNotes ?? "");

    setError(null);
    setSuccess(null);
  }

  async function saveReward(e: FormEvent) {
    e.preventDefault();

    const title = titleInput.trim();

    if (!title) {
      setError("Reward title is required.");
      return;
    }

    const pointsCost = Number(pointsCostInput);

    if (!Number.isFinite(pointsCost) || pointsCost <= 0) {
      setError("Points cost must be a positive number.");
      return;
    }

    const sortOrder = Number(sortOrderInput);

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        rewardId: editingId ?? undefined,

        title,
        description: descriptionInput.trim() || undefined,

        pointsCost,

        status: statusInput,

        isPublic: isPublicInput,
        isFeatured: isFeaturedInput,

        category: categoryInput.trim() || undefined,
        imageUrl: imageUrlInput.trim() || undefined,

        redemptionInstructions:
          redemptionInstructionsInput.trim() || undefined,
        internalNotes: internalNotesInput.trim() || undefined,

        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      };

      const res = await fetch(
        `/api/orgs/${orgId}/growth/reward-circle/rewards`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = (await res
        .json()
        .catch(() => ({}))) as RewardMutationResponse;

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save RewardCircle reward.");
      }

      if (!data.reward) {
        throw new Error("Reward saved, but no reward was returned.");
      }

      const savedReward = normalizeReward(data.reward);

      setRewards((prev) => {
        const exists = prev.some(
          (reward) => reward.rewardId === savedReward.rewardId,
        );

        if (!exists) {
          return [...prev, savedReward];
        }

        return prev.map((reward) =>
          reward.rewardId === savedReward.rewardId ? savedReward : reward,
        );
      });

      setEditingId(savedReward.rewardId);
      setSuccess(editingId ? "Reward updated." : "Reward created.");
    } catch (err: any) {
      console.error("[RewardCircleRewardsPage] save error:", err);
      setError(err?.message || "Failed to save RewardCircle reward.");
    } finally {
      setSaving(false);
    }
  }

  async function quickSetStatus(reward: RewardRow, status: RewardStatus) {
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `/api/orgs/${orgId}/growth/reward-circle/rewards`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            rewardId: reward.rewardId,
            status,
          }),
        },
      );

      const data = (await res
        .json()
        .catch(() => ({}))) as RewardMutationResponse;

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update reward status.");
      }

      if (!data.reward) {
        throw new Error("Reward updated, but no reward was returned.");
      }

      const updatedReward = normalizeReward(data.reward);

      setRewards((prev) =>
        prev.map((item) =>
          item.rewardId === updatedReward.rewardId ? updatedReward : item,
        ),
      );

      if (editingId === updatedReward.rewardId) {
        startEdit(updatedReward);
      }

      setSuccess(`Reward marked ${statusLabel(status).toLowerCase()}.`);
    } catch (err: any) {
      console.error("[RewardCircleRewardsPage] status error:", err);
      setError(err?.message || "Failed to update reward status.");
    }
  }

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
                  Reward
                  <span className="block bg-gradient-to-r from-cyan-300 via-emerald-300 to-fuchsia-300 bg-clip-text text-transparent">
                    Shop Control
                  </span>
                </h1>

                <p className="max-w-3xl text-sm font-medium uppercase leading-6 tracking-[0.16em] text-slate-300 sm:text-base">
                  Build the value marketplace customers can earn toward, desire,
                  redeem, and remember.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 hover:bg-emerald-300 hover:text-slate-950"
              >
                New Reward
              </button>

              <Link
                href={`${base}/settings`}
                className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-cyan-100 hover:bg-cyan-300 hover:text-slate-950"
              >
                Program Rules
              </Link>

              <Link
                href={`${base}/activity`}
                className="rounded-full border border-fuchsia-300/40 bg-fuchsia-400/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-100 hover:bg-fuchsia-300 hover:text-slate-950"
              >
                Value History
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

      {success && (
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-100">
          {success}
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

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
                Reward Catalog
              </p>

              <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
                Shop Inventory
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Control the rewards that turn accumulated points into visible,
                redeemable value.
              </p>
            </div>

            <p className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
              {loading
                ? "Loading Rewards"
                : `${formatNumber(rewards.length)} Rewards`}
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/70 text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Reward
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Visibility
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Featured
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Sort
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedRewards.map((reward) => (
                  <tr
                    key={reward.rewardId}
                    className="border-b border-slate-800/70 last:border-0"
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="font-bold text-slate-50">{reward.title}</p>

                      {reward.description && (
                        <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
                          {reward.description}
                        </p>
                      )}

                      {reward.category && (
                        <p className="mt-2 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
                          {reward.category}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="font-black text-emerald-200">
                        {formatNumber(reward.pointsCost)}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Points
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${statusBadgeClass(
                          reward.status,
                        )}`}
                      >
                        {statusLabel(reward.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                          reward.isPublic
                            ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                            : "border-slate-600 bg-slate-800/50 text-slate-400"
                        }`}
                      >
                        {reward.isPublic ? "Public" : "Hidden"}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                          reward.isFeatured
                            ? "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200"
                            : "border-slate-600 bg-slate-800/50 text-slate-400"
                        }`}
                      >
                        {reward.isFeatured ? "Featured" : "Standard"}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top text-slate-300">
                      {reward.sortOrder ?? 0}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col items-start gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(reward)}
                          className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300 hover:text-cyan-100"
                        >
                          Edit
                        </button>

                        {reward.status === "active" ? (
                          <button
                            type="button"
                            onClick={() => quickSetStatus(reward, "archived")}
                            className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 hover:text-slate-200"
                          >
                            Archive
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => quickSetStatus(reward, "active")}
                            className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300 hover:text-emerald-100"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && sortedRewards.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-slate-400"
                    >
                      No RewardCircle rewards exist yet. Create the first reward
                      to begin shaping the customer value loop.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-slate-400"
                    >
                      Loading RewardCircle rewards...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fuchsia-300/80">
                Reward Builder
              </p>

              <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
                {editingId ? "Edit Reward" : "New Reward"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Define the object of desire: what it costs, where it appears,
                and how staff should fulfill it.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 hover:text-slate-100"
              >
                Clear
              </button>
            )}
          </div>

          <form onSubmit={saveReward} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Title
              </label>
              <input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Free Side Item"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Description
              </label>
              <textarea
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                placeholder="Give members a clear reason to want this reward."
                rows={3}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Points Cost
                </label>
                <input
                  type="number"
                  min="1"
                  value={pointsCostInput}
                  onChange={(e) => setPointsCostInput(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={sortOrderInput}
                  onChange={(e) => setSortOrderInput(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Category
                </label>
                <input
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  placeholder="Food, merch, experience..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Status
                </label>
                <select
                  value={statusInput}
                  onChange={(e) =>
                    setStatusInput(normalizeStatus(e.target.value))
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Image URL
              </label>
              <input
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Optional image or media reference"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isPublicInput}
                    onChange={(e) => setIsPublicInput(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100">
                      Public Shop
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Show this reward to customers when active.
                    </p>
                  </div>
                </div>
              </label>

              <label className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isFeaturedInput}
                    onChange={(e) => setIsFeaturedInput(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-fuchsia-100">
                      Featured Reward
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Give this reward stronger shop visibility.
                    </p>
                  </div>
                </div>
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Redemption Instructions
              </label>
              <textarea
                value={redemptionInstructionsInput}
                onChange={(e) =>
                  setRedemptionInstructionsInput(e.target.value)
                }
                placeholder="Tell staff or members how this reward should be redeemed."
                rows={3}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Internal Notes
              </label>
              <textarea
                value={internalNotesInput}
                onChange={(e) => setInternalNotesInput(e.target.value)}
                placeholder="Private admin/staff notes. Do not show this in the customer shop."
                rows={3}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full border border-emerald-300/40 bg-emerald-400/90 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? editingId
                  ? "Saving Reward..."
                  : "Creating Reward..."
                : editingId
                  ? "Save Reward"
                  : "Create Reward"}
            </button>
          </form>
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className={`rounded-[1.5rem] border p-5 ${toneClasses("soft")}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Shop Doctrine
          </p>
          <h3 className="mt-4 text-xl font-black uppercase tracking-[-0.03em] text-slate-50">
            Rewards Create Desire
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            A reward is not just a discount. It is the object customers earn
            toward, remember, and return for.
          </p>
        </article>

        <article
          className={`rounded-[1.5rem] border p-5 ${toneClasses("rising")}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Visibility Rule
          </p>
          <h3 className="mt-4 text-xl font-black uppercase tracking-[-0.03em] text-slate-50">
            Active + Public
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Customer-facing shop surfaces should only show rewards that are
            active and public-safe.
          </p>
        </article>

        <article className={`rounded-[1.5rem] border p-5 ${toneClasses("watch")}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Admin Warning
          </p>
          <h3 className="mt-4 text-xl font-black uppercase tracking-[-0.03em] text-slate-50">
            Notes Stay Internal
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Internal notes are for staff and owner context only. They should not
            be exposed in public customer shop APIs.
          </p>
        </article>
      </section>
    </section>
  );
}