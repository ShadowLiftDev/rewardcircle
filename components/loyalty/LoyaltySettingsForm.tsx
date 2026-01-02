"use client";

import { useEffect, useState, FormEvent } from "react";
import type { ProgramSettings } from "@/lib/types";

type LoyaltySettingsFormProps = {
  initialSettings: ProgramSettings;
  saving: boolean;
  error: string | null;
  success: string | null;
  onSubmit: (settings: ProgramSettings) => Promise<void>;
};

export function LoyaltySettingsForm({
  initialSettings,
  saving,
  error,
  success,
  onSubmit,
}: LoyaltySettingsFormProps) {
  const [pointsPerDollar, setPointsPerDollar] = useState("1");

  const [tier1, setTier1] = useState("0");
  const [tier2, setTier2] = useState("500");
  const [tier3, setTier3] = useState("1000");
  const [tier4, setTier4] = useState("2000");

  const [tier1Name, setTier1Name] = useState("");
  const [tier2Name, setTier2Name] = useState("");
  const [tier3Name, setTier3Name] = useState("");
  const [tier4Name, setTier4Name] = useState("");

  const [streakEnabled, setStreakEnabled] = useState(true);
  const [streakWindowDays, setStreakWindowDays] = useState("2");
  const [streakBonusPoints, setStreakBonusPoints] = useState("50");
  const [streakMinVisits, setStreakMinVisits] = useState("3");

  useEffect(() => {
    const ps = initialSettings;

    setPointsPerDollar(String(ps.pointsPerDollar ?? 1));

    const thresholds = ps.tierThresholds ?? {
      tier1: 0,
      tier2: 500,
      tier3: 1000,
      tier4: 2000,
    };
    setTier1(String(thresholds.tier1 ?? 0));
    setTier2(String(thresholds.tier2 ?? 500));
    setTier3(String(thresholds.tier3 ?? 1000));
    setTier4(
      typeof thresholds.tier4 === "number" ? String(thresholds.tier4) : "",
    );

    const names = ps.tierNames ?? {};
    setTier1Name(names.tier1 ?? "");
    setTier2Name(names.tier2 ?? "");
    setTier3Name(names.tier3 ?? "");
    setTier4Name(names.tier4 ?? "");

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const p = Number(pointsPerDollar) || 0;
    const t1 = Number(tier1) || 0;
    const t2 = Number(tier2) || 0;
    const t3 = Number(tier3) || 0;
    const rawT4 =
      tier4.trim() === "" ? undefined : Number(tier4) || undefined;

    const windowDays = Number(streakWindowDays) || 0;
    const bonusPoints = Number(streakBonusPoints) || 0;
    const minVisits = Number(streakMinVisits) || 0;

    const settings: ProgramSettings = {
      pointsPerDollar: p,
      tierThresholds: {
        tier1: t1,
        tier2: t2,
        tier3: t3,
        ...(typeof rawT4 === "number" ? { tier4: rawT4 } : {}),
      },
      tierNames: {
        ...(tier1Name ? { tier1: tier1Name } : {}),
        ...(tier2Name ? { tier2: tier2Name } : {}),
        ...(tier3Name ? { tier3: tier3Name } : {}),
        ...(tier4Name ? { tier4: tier4Name } : {}),
      },
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
        <h2 className="text-sm font-semibold text-slate-100">
          Earning rate
        </h2>
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
        <h2 className="text-sm font-semibold text-slate-100">
          Tier thresholds
        </h2>
        <p className="text-xs text-slate-400">
          Set the lifetime points needed to reach each tier.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">
              Tier 1 – minimum points
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-emerald-500"
              value={tier1}
              onChange={(e) => setTier1(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">
              Tier 2 – minimum points
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-emerald-500"
              value={tier2}
              onChange={(e) => setTier2(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">
              Tier 3 – minimum points
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-emerald-500"
              value={tier3}
              onChange={(e) => setTier3(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">
              Tier 4 – minimum points (optional)
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-emerald-500"
              value={tier4}
              onChange={(e) => setTier4(e.target.value)}
              placeholder="Leave blank to disable"
            />
          </div>
        </div>
      </div>

      {/* Tier names */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-100">
          Tier names
        </h2>
        <p className="text-xs text-slate-400">
          Optional labels shown in the app instead of generic “Tier 1 / 2 / 3”.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">Tier 1 name</label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-emerald-500"
              value={tier1Name}
              onChange={(e) => setTier1Name(e.target.value)}
              placeholder="e.g. Neon"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">Tier 2 name</label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-emerald-500"
              value={tier2Name}
              onChange={(e) => setTier2Name(e.target.value)}
              placeholder="e.g. Cosmic"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">Tier 3 name</label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-emerald-500"
              value={tier3Name}
              onChange={(e) => setTier3Name(e.target.value)}
              placeholder="e.g. Galactic"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">
              Tier 4 name (optional)
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 outline-none focus:border-emerald-500"
              value={tier4Name}
              onChange={(e) => setTier4Name(e.target.value)}
              placeholder="e.g. Supernova"
            />
          </div>
        </div>
      </div>

      {/* Streak config */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-100">
          Visit streak bonus
        </h2>
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
              <label className="block text-xs text-slate-400">
                Window (days)
              </label>
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
              <label className="block text-xs text-slate-400">
                Bonus points
              </label>
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