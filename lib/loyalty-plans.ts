import type { ProgramSettings } from "./types";

export type LoyaltyPlanId = "simple" | "standard" | "vip";

export interface LoyaltyPlanConfig {
  id: LoyaltyPlanId;
  name: string;
  tagline: string;
  description: string;
  settings: ProgramSettings;
}

/**
 * Default catalog of loyalty templates.
 * You can change names / numbers anytime without breaking types.
 */
export const LOYALTY_PLANS: Record<LoyaltyPlanId, LoyaltyPlanConfig> = {
  simple: {
    id: "simple",
    name: "Simple Points",
    tagline: "1 point per dollar, 3 tiers",
    description:
      "Straightforward starter program: 1 point per $1, three tiers, light streak bonus to reward regulars.",
    settings: {
      pointsPerDollar: 1,
      tierThresholds: {
        tier1: 0,
        tier2: 300,
        tier3: 800,
        tier4: undefined,
      },
      tierNames: {
        tier1: "Regular",
        tier2: "VIP",
        tier3: "Super VIP",
      },
      streakConfig: {
        enabled: true,
        windowDays: 2,
        bonusPoints: 25,
        minVisitsForBonus: 3,
      },
    },
  },

  standard: {
    id: "standard",
    name: "Standard Loyalty",
    tagline: "1 point per dollar, 4 tiers",
    description:
      "Balanced program with four tiers and a meaningful streak bonus for repeat visits.",
    settings: {
      pointsPerDollar: 1,
      tierThresholds: {
        tier1: 0,
        tier2: 500,
        tier3: 1000,
        tier4: 2000,
      },
      tierNames: {
        tier1: "Regular",
        tier2: "VIP",
        tier3: "Elite",
        tier4: "Legend",
      },
      streakConfig: {
        enabled: true,
        windowDays: 2,
        bonusPoints: 50,
        minVisitsForBonus: 3,
      },
    },
  },

  vip: {
    id: "vip",
    name: "High-Roller",
    tagline: "2 points per dollar, aggressive tiers",
    description:
      "Designed for bigger average tickets: more points per dollar, higher thresholds, and a strong streak reward.",
    settings: {
      pointsPerDollar: 2,
      tierThresholds: {
        tier1: 0,
        tier2: 800,
        tier3: 2000,
        tier4: 4000,
      },
      tierNames: {
        tier1: "Insider",
        tier2: "High Roller",
        tier3: "Ultra VIP",
        tier4: "Hall of Fame",
      },
      streakConfig: {
        enabled: true,
        windowDays: 3,
        bonusPoints: 100,
        minVisitsForBonus: 4,
      },
    },
  },
};

export const DEFAULT_LOYALTY_PLAN_ID: LoyaltyPlanId = "standard";

/**
 * Safe accessor for a plan config.
 */
export function getLoyaltyPlan(
  id: LoyaltyPlanId = DEFAULT_LOYALTY_PLAN_ID,
): LoyaltyPlanConfig {
  return LOYALTY_PLANS[id];
}

/**
 * Convenience helper when you want a fresh copy of the settings object
 * (so you don't accidentally mutate the shared catalog).
 */
export function cloneProgramSettingsFromPlan(
  id: LoyaltyPlanId,
): ProgramSettings {
  const base = getLoyaltyPlan(id).settings;

  return {
    pointsPerDollar: base.pointsPerDollar,
    tierThresholds: {
      tier1: base.tierThresholds.tier1,
      tier2: base.tierThresholds.tier2,
      tier3: base.tierThresholds.tier3,
      ...(base.tierThresholds.tier4 != null
        ? { tier4: base.tierThresholds.tier4 }
        : {}),
    },
    tierNames: base.tierNames ? { ...base.tierNames } : undefined,
    streakConfig: {
      enabled: base.streakConfig.enabled,
      windowDays: base.streakConfig.windowDays,
      bonusPoints: base.streakConfig.bonusPoints,
      minVisitsForBonus: base.streakConfig.minVisitsForBonus,
    },
  };
}