import type { ProgramSettings } from "./types";

// For now we only really need a single plan that matches the
// Firestore default "Standard Loyalty Program".
export type LoyaltyPlanId = "default";

export interface LoyaltyPlanConfig {
  id: LoyaltyPlanId;
  name: string;
  tagline: string;
  description: string;
  settings: ProgramSettings;
}

/**
 * Single default plan that mirrors your Firestore
 * orgs/{orgId}/loyaltyPrograms/default document.
 */
const DEFAULT_PLAN: LoyaltyPlanConfig = {
  id: "default",
  name: "Standard Loyalty Program",
  tagline: "2 points per dollar, 4 tiers",
  description:
    "Earn 2 points per $1 spent and climb from Starter to VIP with a visit streak bonus for regulars.",
  settings: {
    // matches pointRules.pointsPerDollar in Firestore
    pointsPerDollar: 2,

    // dynamic tier map: ids line up with Firestore tiers[].id
    tierThresholds: {
      starter: 250,
      intermediate: 1000,
      expert: 2500,
      vip: 5000,
    },

    // UI names line up with Firestore tiers[].name
    tierNames: {
      starter: "Starter",
      intermediate: "Intermediate",
      expert: "Expert",
      vip: "VIP",
    },

    // You don’t store this in Firestore yet, but it’s harmless default config.
    streakConfig: {
      enabled: true,
      windowDays: 2,
      bonusPoints: 50,
      minVisitsForBonus: 3,
    },
  },
};

export const LOYALTY_PLANS: Record<LoyaltyPlanId, LoyaltyPlanConfig> = {
  default: DEFAULT_PLAN,
};

export const DEFAULT_LOYALTY_PLAN_ID: LoyaltyPlanId = "default";

/**
 * Safe accessor (kept so any existing imports don’t break).
 */
export function getLoyaltyPlan(
  id: LoyaltyPlanId = DEFAULT_LOYALTY_PLAN_ID,
): LoyaltyPlanConfig {
  return LOYALTY_PLANS[id] ?? DEFAULT_PLAN;
}

/**
 * Convenience helper: get a fresh copy of ProgramSettings for seeding.
 */
export function cloneProgramSettingsFromPlan(
  id: LoyaltyPlanId,
): ProgramSettings {
  const base = getLoyaltyPlan(id).settings;

  // Deep-ish clone so we never mutate the catalog object by accident
  return {
    pointsPerDollar: base.pointsPerDollar,
    tierThresholds: { ...base.tierThresholds },
    tierNames: base.tierNames ? { ...base.tierNames } : undefined,
    streakConfig: {
      enabled: base.streakConfig.enabled,
      windowDays: base.streakConfig.windowDays,
      bonusPoints: base.streakConfig.bonusPoints,
      minVisitsForBonus: base.streakConfig.minVisitsForBonus,
    },
  };
}