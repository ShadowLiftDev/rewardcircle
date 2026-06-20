"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RewardCircleAdminTabs } from "@/components/rewardcircle/RewardCircleAdminTabs";

import type {
  RewardCircleProgram,
  RewardCircleProgramConfig,
  RewardCircleProgramStatus,
  RewardCircleStatus,
  RewardCircleTierConfig,
  RewardCircleTimestamp,
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

type RewardCircleSettingsPayload = {
  config: RewardCircleProgramConfig;
  activeProgram: RewardCircleProgram;
};

type SettingsResponse =
  | RewardCircleSettingsPayload
  | {
      error?: string;
    };

type SaveSettingsResponse = {
  ok?: boolean;
  settings?: RewardCircleSettingsPayload;
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

function formatNumber(value: unknown) {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n)) return "0";

  return n.toLocaleString();
}

function normalizeNumber(value: unknown, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n) ? n : fallback;
}

function normalizeStatus(value: unknown): RewardCircleStatus {
  const status = String(value ?? "").trim().toLowerCase();

  if (status === "active" || status === "inactive" || status === "archived") {
    return status;
  }

  return "active";
}

function normalizeProgramStatus(value: unknown): RewardCircleProgramStatus {
  const status = String(value ?? "").trim().toLowerCase();

  if (
    status === "draft" ||
    status === "active" ||
    status === "paused" ||
    status === "archived"
  ) {
    return status;
  }

  return "active";
}

function statusLabel(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Active";
}

function defaultTimestamp(): RewardCircleTimestamp {
  return new Date().toISOString();
}

function makeDefaultTier(index: number): RewardCircleTierConfig {
  const now = defaultTimestamp();

  return {
    tierId: `tier-${index + 1}`,
    name: `Tier ${index + 1}`,
    threshold: index * 1000,
    description: "",
    badgeLabel: `Tier ${index + 1}`,
    sortOrder: index + 1,
    createdAt: now,
    updatedAt: now,
  };
}

function isSettingsPayload(value: unknown): value is RewardCircleSettingsPayload {
  if (!value || typeof value !== "object") return false;

  const maybe = value as Partial<RewardCircleSettingsPayload>;

  return Boolean(maybe.config && maybe.activeProgram);
}

function updateTierField(
  tiers: RewardCircleTierConfig[],
  index: number,
  field: keyof RewardCircleTierConfig,
  value: string | number,
) {
  return tiers.map((tier, tierIndex) => {
    if (tierIndex !== index) return tier;

    return {
      ...tier,
      [field]: value,
      updatedAt: new Date().toISOString(),
    };
  });
}

export default function RewardCircleSettingsPage() {
  const params = useParams();
  const orgId = readParam(params?.orgId as string | string[] | undefined);

  const base = `/orgs/${orgId}/growth/reward-circle`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] =
    useState<RewardCircleSettingsPayload | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const config = settings?.config ?? null;
  const activeProgram = settings?.activeProgram ?? null;

  const stats = useMemo(() => {
    return [
      {
        label: "Program Status",
        value: statusLabel(activeProgram?.status ?? config?.status ?? "active"),
        hint: "Current operating posture for the RewardCircle value engine.",
        tone: "cyan" as Tone,
      },
      {
        label: "Points Per Dollar",
        value: formatNumber(activeProgram?.pointsPerDollar ?? 0),
        hint: "Purchase earning pressure applied through the active program.",
        tone: "emerald" as Tone,
      },
      {
        label: "Join Bonus",
        value: `${formatNumber(activeProgram?.joinBonusPoints ?? 0)} PTS`,
        hint: "Initial value granted when a member enters RewardCircle.",
        tone: "violet" as Tone,
      },
      {
        label: "Tier Count",
        value: formatNumber(activeProgram?.tiers?.length ?? 0),
        hint: "Loyalty ladder levels currently configured for members.",
        tone: "silver" as Tone,
      },
    ];
  }, [activeProgram, config]);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      setError("Missing orgId.");
      return;
    }

    let alive = true;

    async function loadSettings() {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);

        const res = await fetch(
          `/api/orgs/${orgId}/growth/reward-circle/settings`,
          {
            cache: "no-store",
          },
        );

        const data = (await res.json().catch(() => ({}))) as SettingsResponse;

        if (!alive) return;

        if (!res.ok) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Failed to load RewardCircle settings.",
          );
        }

        if (!isSettingsPayload(data)) {
          throw new Error("RewardCircle settings payload was incomplete.");
        }

        setSettings(data);
      } catch (err: any) {
        console.error("[RewardCircleSettingsPage] load error:", err);

        if (!alive) return;

        setError(err?.message || "Failed to load RewardCircle settings.");
        setSettings(null);
      } finally {
        if (!alive) return;

        setLoading(false);
      }
    }

    loadSettings();

    return () => {
      alive = false;
    };
  }, [orgId]);

  function patchConfig(patch: Partial<RewardCircleProgramConfig>) {
    setSettings((current) => {
      if (!current) return current;

      return {
        ...current,
        config: {
          ...current.config,
          ...patch,
          orgId,
          moduleId: "rewardcircle",
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }

  function patchProgram(patch: Partial<RewardCircleProgram>) {
    setSettings((current) => {
      if (!current) return current;

      return {
        ...current,
        activeProgram: {
          ...current.activeProgram,
          ...patch,
          orgId,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }

  function patchEarningRules(patch: {
    joinBonusPoints?: number;
    pointsPerCheckIn?: number;
    pointsPerDollar?: number;
  }) {
    setSettings((current) => {
      if (!current) return current;

      return {
        ...current,
        config: {
          ...current.config,
          defaultJoinBonusPoints:
            patch.joinBonusPoints ?? current.config.defaultJoinBonusPoints,
          defaultPointsPerCheckIn:
            patch.pointsPerCheckIn ?? current.config.defaultPointsPerCheckIn,
          defaultPointsPerDollar:
            patch.pointsPerDollar ?? current.config.defaultPointsPerDollar,
          updatedAt: new Date().toISOString(),
        },
        activeProgram: {
          ...current.activeProgram,
          joinBonusPoints:
            patch.joinBonusPoints ?? current.activeProgram.joinBonusPoints,
          pointsPerCheckIn:
            patch.pointsPerCheckIn ?? current.activeProgram.pointsPerCheckIn,
          pointsPerDollar:
            patch.pointsPerDollar ?? current.activeProgram.pointsPerDollar,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }

  function patchStreakConfig(
    patch: Partial<NonNullable<RewardCircleProgram["streakConfig"]>>,
  ) {
    setSettings((current) => {
      if (!current) return current;

      const existing = current.activeProgram.streakConfig ?? {
        enabled: false,
        windowDays: 2,
        bonusPoints: 0,
        minVisitsForBonus: 3,
      };

      return {
        ...current,
        activeProgram: {
          ...current.activeProgram,
          streakConfig: {
            ...existing,
            ...patch,
          },
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }

  function patchHowItWorksStep(index: number, value: string) {
    setSettings((current) => {
      if (!current) return current;

      const steps = [...(current.config.howItWorksSteps ?? [])];

      while (steps.length < 3) {
        steps.push("");
      }

      steps[index] = value;

      return {
        ...current,
        config: {
          ...current.config,
          howItWorksSteps: steps,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }

  function patchTier(
    index: number,
    field: keyof RewardCircleTierConfig,
    value: string | number,
  ) {
    setSettings((current) => {
      if (!current) return current;

      const tiers =
        current.activeProgram.tiers && current.activeProgram.tiers.length > 0
          ? current.activeProgram.tiers
          : [makeDefaultTier(0)];

      return {
        ...current,
        activeProgram: {
          ...current.activeProgram,
          tiers: updateTierField(tiers, index, field, value),
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }

  function addTier() {
    setSettings((current) => {
      if (!current) return current;

      const tiers = current.activeProgram.tiers ?? [];

      return {
        ...current,
        activeProgram: {
          ...current.activeProgram,
          tiers: [...tiers, makeDefaultTier(tiers.length)],
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();

    if (!settings) {
      setError("No RewardCircle settings are loaded.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const now = new Date().toISOString();

      const payload: RewardCircleSettingsPayload = {
        config: {
          ...settings.config,
          orgId,
          moduleId: "rewardcircle",
          status: normalizeStatus(settings.config.status),
          activeProgramId:
            settings.config.activeProgramId ||
            settings.activeProgram.programId ||
            "default",
          rewardCurrencyName:
            settings.config.rewardCurrencyName?.trim() || "points",
          publicHeadline:
            settings.config.publicHeadline?.trim() ||
            "Earn rewards every time you come back.",
          publicDescription:
            settings.config.publicDescription?.trim() ||
            "Join this business's RewardCircle to earn points, unlock rewards, and turn your visits into visible value.",
          howItWorksSteps: (settings.config.howItWorksSteps ?? [])
            .map((step) => String(step ?? "").trim())
            .filter(Boolean),
          updatedAt: now,
        },
        activeProgram: {
          ...settings.activeProgram,
          orgId,
          programId: settings.activeProgram.programId || "default",
          status: normalizeProgramStatus(settings.activeProgram.status),
          name: settings.activeProgram.name?.trim() || "RewardCircle Program",
          description: settings.activeProgram.description?.trim() || "",
          pointsPerCheckIn: normalizeNumber(
            settings.activeProgram.pointsPerCheckIn,
          ),
          pointsPerDollar: normalizeNumber(
            settings.activeProgram.pointsPerDollar,
            1,
          ),
          joinBonusPoints: normalizeNumber(
            settings.activeProgram.joinBonusPoints,
          ),
          tiers:
            settings.activeProgram.tiers?.map((tier, index) => ({
              ...tier,
              tierId: tier.tierId || `tier-${index + 1}`,
              name: tier.name?.trim() || `Tier ${index + 1}`,
              threshold: normalizeNumber(tier.threshold),
              badgeLabel:
                tier.badgeLabel?.trim() || tier.name?.trim() || `Tier ${index + 1}`,
              sortOrder: normalizeNumber(tier.sortOrder, index + 1),
              updatedAt: now,
            })) ?? [],
          streakConfig: settings.activeProgram.streakConfig
            ? {
                enabled: Boolean(settings.activeProgram.streakConfig.enabled),
                windowDays: normalizeNumber(
                  settings.activeProgram.streakConfig.windowDays,
                  2,
                ),
                bonusPoints: normalizeNumber(
                  settings.activeProgram.streakConfig.bonusPoints,
                ),
                minVisitsForBonus: normalizeNumber(
                  settings.activeProgram.streakConfig.minVisitsForBonus,
                  3,
                ),
              }
            : undefined,
          updatedAt: now,
        },
      };

      payload.config.defaultJoinBonusPoints =
        payload.activeProgram.joinBonusPoints;
      payload.config.defaultPointsPerCheckIn =
        payload.activeProgram.pointsPerCheckIn;
      payload.config.defaultPointsPerDollar =
        payload.activeProgram.pointsPerDollar;
      payload.config.activeProgramId = payload.activeProgram.programId;

      const res = await fetch(
        `/api/orgs/${orgId}/growth/reward-circle/settings`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = (await res
        .json()
        .catch(() => ({}))) as SaveSettingsResponse;

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save RewardCircle settings.");
      }

      if (!data.settings) {
        throw new Error("Settings saved, but no settings payload returned.");
      }

      setSettings(data.settings);
      setSuccess("RewardCircle program rules saved.");
    } catch (err: any) {
      console.error("[RewardCircleSettingsPage] save error:", err);
      setError(err?.message || "Failed to save RewardCircle settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !settings) {
    return (
      <section className="space-y-8">
        <header className="space-y-5">
          <div className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/90 p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)] sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-300/80">
              NeonHQ · Growth Layer · RewardCircle
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.04em] text-slate-50 sm:text-5xl">
              Program Rules
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-medium uppercase leading-6 tracking-[0.16em] text-slate-300">
              Loading the earning rules, public promise, and loyalty ladder.
            </p>
          </div>

          <RewardCircleAdminTabs />
        </header>

        <p className="text-sm text-slate-400">
          Loading RewardCircle settings...
        </p>
      </section>
    );
  }

  if (!settings || !config || !activeProgram) {
    return (
      <section className="space-y-8">
        <header className="space-y-5">
          <div className="overflow-hidden rounded-[2rem] border border-red-400/20 bg-slate-950/90 p-6 sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-red-300/80">
              NeonHQ · Growth Layer · RewardCircle
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.04em] text-slate-50 sm:text-5xl">
              Settings Unavailable
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-medium uppercase leading-6 tracking-[0.16em] text-slate-300">
              The RewardCircle settings payload could not be loaded.
            </p>
          </div>

          <RewardCircleAdminTabs />
        </header>

        {error && (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100">
            {error}
          </div>
        )}
      </section>
    );
  }

  const streak = activeProgram.streakConfig ?? {
    enabled: false,
    windowDays: 2,
    bonusPoints: 0,
    minVisitsForBonus: 3,
  };

  const tiers =
    activeProgram.tiers && activeProgram.tiers.length > 0
      ? activeProgram.tiers
      : [makeDefaultTier(0)];

  return (
    <form onSubmit={saveSettings} className="space-y-8">
      <header className="space-y-5">
        <div className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/90 p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-300/80">
                NeonHQ · Growth Layer · RewardCircle
              </p>

              <div className="space-y-3">
                <h1 className="text-4xl font-black uppercase tracking-[-0.04em] text-slate-50 sm:text-5xl lg:text-6xl">
                  Program
                  <span className="block bg-gradient-to-r from-cyan-300 via-emerald-300 to-fuchsia-300 bg-clip-text text-transparent">
                    Rules
                  </span>
                </h1>

                <p className="max-w-3xl text-sm font-medium uppercase leading-6 tracking-[0.16em] text-slate-300 sm:text-base">
                  Configure the earning logic, public promise, staff permissions,
                  streak behavior, and tier ladder that power RewardCircle.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full border border-emerald-300/40 bg-emerald-400/90 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving Rules..." : "Save Rules"}
              </button>

              <Link
                href={`${base}/rewards`}
                className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-cyan-100 hover:bg-cyan-300 hover:text-slate-950"
              >
                Reward Shop
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

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-5">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
              Program Identity
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
              Value Engine Identity
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Define what this RewardCircle program is called and how its value
              is described.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Program Name
              </label>
              <input
                value={activeProgram.name}
                onChange={(e) => patchProgram({ name: e.target.value })}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Program Description
              </label>
              <textarea
                value={activeProgram.description ?? ""}
                onChange={(e) =>
                  patchProgram({ description: e.target.value })
                }
                rows={3}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Program Status
                </label>
                <select
                  value={activeProgram.status}
                  onChange={(e) =>
                    patchProgram({
                      status: normalizeProgramStatus(e.target.value),
                    })
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Reward Currency
                </label>
                <input
                  value={config.rewardCurrencyName}
                  onChange={(e) =>
                    patchConfig({ rewardCurrencyName: e.target.value })
                  }
                  placeholder="points"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-5">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
              Public Promise
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
              Customer-Facing Copy
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Shape the public explanation that tells members why RewardCircle
              is worth joining.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Public Headline
              </label>
              <input
                value={config.publicHeadline}
                onChange={(e) =>
                  patchConfig({ publicHeadline: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Public Description
              </label>
              <textarea
                value={config.publicDescription}
                onChange={(e) =>
                  patchConfig({ publicDescription: e.target.value })
                }
                rows={4}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                How It Works
              </p>

              {[0, 1, 2].map((index) => (
                <input
                  key={index}
                  value={config.howItWorksSteps?.[index] ?? ""}
                  onChange={(e) =>
                    patchHowItWorksStep(index, e.target.value)
                  }
                  placeholder={`Step ${index + 1}`}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-5">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fuchsia-300/80">
              Earning Rules
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
              Points Logic
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              These values control how members earn visible loyalty value.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Join Bonus Points
              </label>
              <input
                type="number"
                min="0"
                value={activeProgram.joinBonusPoints}
                onChange={(e) =>
                  patchEarningRules({
                    joinBonusPoints: normalizeNumber(e.target.value),
                  })
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Points Per Check-In
              </label>
              <input
                type="number"
                min="0"
                value={activeProgram.pointsPerCheckIn}
                onChange={(e) =>
                  patchEarningRules({
                    pointsPerCheckIn: normalizeNumber(e.target.value),
                  })
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Points Per Dollar
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={activeProgram.pointsPerDollar}
                onChange={(e) =>
                  patchEarningRules({
                    pointsPerDollar: normalizeNumber(e.target.value, 1),
                  })
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-5">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
              Program Permissions
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
              Access Controls
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Control which customer and staff actions are allowed inside this
              RewardCircle program.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: "Public Join",
                description: "Allow customers to join through public surfaces.",
                checked: config.allowPublicJoin,
                onChange: (checked: boolean) =>
                  patchConfig({ allowPublicJoin: checked }),
              },
              {
                label: "Staff Lookup",
                description: "Allow staff to find member wallets by phone.",
                checked: config.allowStaffLookup,
                onChange: (checked: boolean) =>
                  patchConfig({ allowStaffLookup: checked }),
              },
              {
                label: "Staff Check-In",
                description: "Allow staff to trigger visit and streak logic.",
                checked: config.allowStaffCheckIn,
                onChange: (checked: boolean) =>
                  patchConfig({ allowStaffCheckIn: checked }),
              },
              {
                label: "Manual Adjustments",
                description: "Allow authorized staff/admin point corrections.",
                checked: config.allowManualAdjustments,
                onChange: (checked: boolean) =>
                  patchConfig({ allowManualAdjustments: checked }),
              },
              {
                label: "Reward Redemption",
                description: "Allow points to become redeemable value.",
                checked: config.allowRewardRedemption,
                onChange: (checked: boolean) =>
                  patchConfig({ allowRewardRedemption: checked }),
              },
            ].map((item) => (
              <label
                key={item.label}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.onChange(e.target.checked)}
                    className="mt-1"
                  />

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-100">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-5">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-300/80">
              Streak Behavior
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
              Return Momentum
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Use streak bonuses to reward repeat behavior within a time window.
            </p>
          </div>

          <div className="space-y-4">
            <label className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={streak.enabled}
                  onChange={(e) =>
                    patchStreakConfig({ enabled: e.target.checked })
                  }
                  className="mt-1"
                />

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-100">
                    Enable Streak Bonus
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Reward members who keep returning inside the configured
                    visit window.
                  </p>
                </div>
              </div>
            </label>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Window Days
                </label>
                <input
                  type="number"
                  min="1"
                  value={streak.windowDays}
                  onChange={(e) =>
                    patchStreakConfig({
                      windowDays: normalizeNumber(e.target.value, 2),
                    })
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Minimum Visits
                </label>
                <input
                  type="number"
                  min="1"
                  value={streak.minVisitsForBonus}
                  onChange={(e) =>
                    patchStreakConfig({
                      minVisitsForBonus: normalizeNumber(e.target.value, 3),
                    })
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Bonus Points
                </label>
                <input
                  type="number"
                  min="0"
                  value={streak.bonusPoints}
                  onChange={(e) =>
                    patchStreakConfig({
                      bonusPoints: normalizeNumber(e.target.value),
                    })
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
                Tier Ladder
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-slate-50">
                Member Status Path
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Define the progression markers members climb as their lifetime
                points grow.
              </p>
            </div>

            <button
              type="button"
              onClick={addTier}
              className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100 hover:bg-emerald-300 hover:text-slate-950"
            >
              Add Tier
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/70 text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Tier
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Threshold
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Badge
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em]">
                    Description
                  </th>
                </tr>
              </thead>

              <tbody>
                {tiers.map((tier, index) => (
                  <tr
                    key={`${tier.tierId}-${index}`}
                    className="border-b border-slate-800/70 last:border-0"
                  >
                    <td className="px-4 py-4 align-top">
                      <input
                        value={tier.name}
                        onChange={(e) =>
                          patchTier(index, "name", e.target.value)
                        }
                        className="w-40 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </td>

                    <td className="px-4 py-4 align-top">
                      <input
                        type="number"
                        min="0"
                        value={tier.threshold}
                        onChange={(e) =>
                          patchTier(
                            index,
                            "threshold",
                            normalizeNumber(e.target.value),
                          )
                        }
                        className="w-32 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </td>

                    <td className="px-4 py-4 align-top">
                      <input
                        value={tier.badgeLabel ?? ""}
                        onChange={(e) =>
                          patchTier(index, "badgeLabel", e.target.value)
                        }
                        className="w-40 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </td>

                    <td className="px-4 py-4 align-top">
                      <input
                        value={tier.description ?? ""}
                        onChange={(e) =>
                          patchTier(index, "description", e.target.value)
                        }
                        className="min-w-64 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className={`rounded-[1.5rem] border p-5 ${toneClasses("soft")}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Settings Doctrine
          </p>
          <h3 className="mt-4 text-xl font-black uppercase tracking-[-0.03em] text-slate-50">
            Rules Create Behavior
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            The settings page defines how customers earn, return, progress, and
            eventually redeem value.
          </p>
        </article>

        <article
          className={`rounded-[1.5rem] border p-5 ${toneClasses("rising")}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Mirrored Values
          </p>
          <h3 className="mt-4 text-xl font-black uppercase tracking-[-0.03em] text-slate-50">
            Config + Program
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Launch earning values are mirrored into both module config and the
            active program to prevent rule drift.
          </p>
        </article>

        <article className={`rounded-[1.5rem] border p-5 ${toneClasses("watch")}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Admin Warning
          </p>
          <h3 className="mt-4 text-xl font-black uppercase tracking-[-0.03em] text-slate-50">
            Save Full Payload
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            The settings API expects the complete config and active program, not
            a partial patch.
          </p>
        </article>
      </section>
    </form>
  );
}