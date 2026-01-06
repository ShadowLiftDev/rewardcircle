"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import type { ProgramSettings } from "@/lib/types";

type LoyaltySettingsFormProps = {
  initialSettings: ProgramSettings;
  saving: boolean;
  error: string | null;
  success: string | null;
  onSubmit: (settings: ProgramSettings) => Promise<void>;
};

type TierRow = {
  id: string; // e.g. "starter"
  name: string; // e.g. "Starter"
  requiredPoints: string; // keep as string for controlled input
};

function normalizeId(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

export function LoyaltySettingsForm({
  initialSettings,
  saving,
  error,
  success,
  onSubmit,
}: LoyaltySettingsFormProps) {
  const [pointsPerDollar, setPointsPerDollar] = useState("1");

  const [tiers, setTiers] = useState<TierRow[]>([]);

  const [streakEnabled, setStreakEnabled] = useState(true);
  const [streakWindowDays, setStreakWindowDays] = useState("2");
  const [streakBonusPoints, setStreakBonusPoints] = useState("50");
  const [streakMinVisits, setStreakMinVisits] = useState("3");

  useEffect(() => {
    const ps = initialSettings;

    setPointsPerDollar(String(ps.pointsPerDollar ?? 1));

    const thresholds = ps.tierThresholds ?? {};
    const names = ps.tierNames ?? {};

    const rows: TierRow[] = Object.entries(thresholds)
      .map(([id, requiredPoints]) => ({
        id: String(id),
        name: String(names[id] ?? ""),
        requiredPoints: String(
          Number.isFinite(Number(requiredPoints)) ? Number(requiredPoints) : 0,
        ),
      }))
      .sort((a, b) => Number(a.requiredPoints) - Number(b.requiredPoints));

    // If nothing loaded, seed sensible defaults
    setTiers(
      rows.length
        ? rows
        : [
            { id: "starter", name: "Starter", requiredPoints: "250" },
            { id: "intermediate", name: "Intermediate", requiredPoints: "1000" },
            { id: "expert", name: "Expert", requiredPoints: "2500" },
            { id: "vip", name: "VIP", requiredPoints: "5000" },
          ],
    );

    const streak = ps.streakConfig ?? {
      enabled: true,
      windowDays: 2,
      bonusPoints: 50,
      minVisitsForBonus: 3,
    };
    setStreakEnabled(streak.enabled ?? true);
    setStreakWindowDays(String(streak.windowDays ?? 2));
    setStreakBonusPoints(String(streak.bonusPoints ?? 50));
    setStreakMinVisits(String(streak.minVisitsForBonus ?? 3));
  }, [initialSettings]);

  const tierIdsLower = useMemo(
    () => new Set(tiers.map((t) => normalizeId(t.id))),
    [tiers],
  );

  function updateTier(index: number, patch: Partial<TierRow>) {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function addTier() {
    // pick a unique id
    let base = "new-tier";
    let id = base;
    let n = 2;
    while (tierIdsLower.has(id)) {
      id = `${base}-${n++}`;
    }

    setTiers((prev) => [
      ...prev,
      { id, name: "", requiredPoints: "0" },
    ]);
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const p = Number(pointsPerDollar) || 0;

    const windowDays = Number(streakWindowDays) || 0;
    const bonusPoints = Number(streakBonusPoints) || 0;
    const minVisits = Number(streakMinVisits) || 0;

    // Build thresholds + names from tiers
    const tierThresholds: Record<string, number> = {};
    const tierNames: Record<string, string> = {};

    for (const row of tiers) {
      const id = normalizeId(row.id);
      if (!id) continue;

      const req = Number(row.requiredPoints);
      tierThresholds[id] = Number.isFinite(req) ? req : 0;

      const nm = row.name.trim();
      if (nm) tierNames[id] = nm;
    }

    // Safety: must have at least 1 tier
    if (Object.keys(tierThresholds).length === 0) {
      throw new Error("Add at least one tier before saving.");
    }

    const settings: ProgramSettings = {
      pointsPerDollar: p,
      tierThresholds,
      tierNames,
      streakConfig: {
        enabled: streakEnabled,
        windowDays,
        bonusPoints,
        minVisitsForBonus: minVisits,
      },
    };

    await onSubmit(settings);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6"
    >
      {/* Status messages */}
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {success}
        </div>
      )}

      {/* Points per $1 */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-100">Earning rate</h2>
        <p className="text-xs text-slate-400">
          How many points a customer earns for each $1 spent.
        </p>
        <div className="flex max-w-xs items-center gap-2">
          <span className="text-sm text-slate-300">$1 =</span>
          <input
            type="number"
            min={0}
            step="0.1"
            className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-emerald-500"
            value={pointsPerDollar}
            onChange={(e) => setPointsPerDollar(e.target.value)}
          />
          <span className="text-sm text-slate-300">pts</span>
        </div>
      </div>

      {/* Tier thresholds */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Tiers</h2>
            <p className="text-xs text-slate-400">
              Edit tier IDs (used internally), names, and lifetime point thresholds.
            </p>
          </div>

          <button
            type="button"
            onClick={addTier}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-xs hover:bg-white hover:text-black"
          >
            Add tier
          </button>
        </div>

        <div className="grid gap-3">
          {tiers.map((t, idx) => {
            const normalized = normalizeId(t.id);
            const duplicate =
              normalized &&
              tiers.filter((x) => normalizeId(x.id) === normalized).length > 1;

            return (
              <div
                key={`${t.id}-${idx}`}
                className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-400">
                      Tier ID (e.g. starter)
                    </label>
                    <input
                      type="text"
                      className={`w-full rounded-md border bg-slate-900 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-emerald-500 ${
                        duplicate ? "border-red-500/60" : "border-slate-700"
                      }`}
                      value={t.id}
                      onChange={(e) => updateTier(idx, { id: e.target.value })}
                      placeholder="starter"
                    />
                    {duplicate && (
                      <p className="text-[11px] text-red-200">
                        Tier IDs must be unique.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs text-slate-400">
                      Tier name (shown in UI)
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-emerald-500"
                      value={t.name}
                      onChange={(e) => updateTier(idx, { name: e.target.value })}
                      placeholder="Starter"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs text-slate-400">
                      Required lifetime points
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-emerald-500"
                      value={t.requiredPoints}
                      onChange={(e) =>
                        updateTier(idx, { requiredPoints: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeTier(idx)}
                    className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-red-500/10 hover:text-red-200"
                    disabled={tiers.length <= 1}
                    title={tiers.length <= 1 ? "You need at least one tier." : ""}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Streak config */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-100">Visit streak bonus</h2>
        <p className="text-xs text-slate-400">
          Reward customers for visiting multiple times within a short window.
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStreakEnabled((v) => !v)}
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              streakEnabled
                ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/60"
                : "bg-slate-800 text-slate-300 border border-slate-600"
            }`}
          >
            {streakEnabled ? "Enabled" : "Disabled"}
          </button>
          <span className="text-xs text-slate-400">
            Customers earn a one-time bonus when they hit the visit streak.
          </span>
        </div>

        {streakEnabled && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Window (days)</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-emerald-500"
                value={streakWindowDays}
                onChange={(e) => setStreakWindowDays(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">
                Min visits in window
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-emerald-500"
                value={streakMinVisits}
                onChange={(e) => setStreakMinVisits(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Bonus points</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-emerald-500"
                value={streakBonusPoints}
                onChange={(e) => setStreakBonusPoints(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-medium text-black shadow hover:bg-emerald-400 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}