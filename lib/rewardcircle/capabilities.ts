import type {
  OwnerOpticsPlanId,
  RewardCircleCapabilitySet,
} from "./types";

// -----------------------------------------------------------------------------
// Doctrine
// -----------------------------------------------------------------------------
// NeonHQ owns pricing, billing, subscription state, plan selection,
// platform-wide access, and module visibility.
//
// RewardCircle does not decide what a business pays for.
// RewardCircle only translates the org's OwnerOptics plan into
// RewardCircle-specific capabilities and limits.

// -----------------------------------------------------------------------------
// Defaults
// -----------------------------------------------------------------------------

export const REWARDCIRCLE_DEFAULT_PLAN_ID: OwnerOpticsPlanId = "core";

// -----------------------------------------------------------------------------
// Capability map
// -----------------------------------------------------------------------------

export const REWARDCIRCLE_CAPABILITIES_BY_PLAN: Record<
  OwnerOpticsPlanId,
  RewardCircleCapabilitySet
> = {
  core: {
    planId: "core",

    maxCustomerRecords: 500,
    maxActiveRewards: 10,
    maxPrograms: 1,

    supportsPublicJoin: true,
    supportsStaffCheckIn: true,
    supportsManualAdjustments: true,
    supportsRewardRedemption: true,

    supportsFeaturedRewards: true,
    supportsCustomTiers: false,
    supportsStreakBonuses: false,

    supportsReferralPointTriggers: false,
    supportsQuestPointTriggers: false,

    supportsAdvancedRewardAnalytics: false,
    supportsMultiLocationRewards: false,
  },

  growth: {
    planId: "growth",

    maxCustomerRecords: 2500,
    maxActiveRewards: 25,
    maxPrograms: 1,

    supportsPublicJoin: true,
    supportsStaffCheckIn: true,
    supportsManualAdjustments: true,
    supportsRewardRedemption: true,

    supportsFeaturedRewards: true,
    supportsCustomTiers: true,
    supportsStreakBonuses: true,

    supportsReferralPointTriggers: true,
    supportsQuestPointTriggers: false,

    supportsAdvancedRewardAnalytics: false,
    supportsMultiLocationRewards: false,
  },

  scale: {
    planId: "scale",

    maxCustomerRecords: 10000,
    maxActiveRewards: 100,
    maxPrograms: 3,

    supportsPublicJoin: true,
    supportsStaffCheckIn: true,
    supportsManualAdjustments: true,
    supportsRewardRedemption: true,

    supportsFeaturedRewards: true,
    supportsCustomTiers: true,
    supportsStreakBonuses: true,

    supportsReferralPointTriggers: true,
    supportsQuestPointTriggers: true,

    supportsAdvancedRewardAnalytics: true,
    supportsMultiLocationRewards: true,
  },
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export function isOwnerOpticsPlanId(value: unknown): value is OwnerOpticsPlanId {
  return value === "core" || value === "growth" || value === "scale";
}

export function normalizeOwnerOpticsPlanId(
  value: unknown,
): OwnerOpticsPlanId {
  if (isOwnerOpticsPlanId(value)) return value;
  return REWARDCIRCLE_DEFAULT_PLAN_ID;
}

export function getRewardCircleCapabilities(
  planId?: OwnerOpticsPlanId | string | null,
): RewardCircleCapabilitySet {
  const normalizedPlanId = normalizeOwnerOpticsPlanId(planId);

  return REWARDCIRCLE_CAPABILITIES_BY_PLAN[normalizedPlanId];
}

export function getRewardCirclePlanLabel(
  planId?: OwnerOpticsPlanId | string | null,
): string {
  const normalizedPlanId = normalizeOwnerOpticsPlanId(planId);

  switch (normalizedPlanId) {
    case "core":
      return "Core";
    case "growth":
      return "Growth";
    case "scale":
      return "Scale";
    default:
      return "Core";
  }
}

export type RewardCircleCapabilityKey = keyof Omit<
  RewardCircleCapabilitySet,
  "planId"
>;

export function getRewardCircleCapabilityValue<
  Key extends RewardCircleCapabilityKey,
>(
  planId: OwnerOpticsPlanId | string | null | undefined,
  key: Key,
): RewardCircleCapabilitySet[Key] {
  const capabilities = getRewardCircleCapabilities(planId);
  return capabilities[key];
}

export function canUseRewardCircleFeature(
  planId: OwnerOpticsPlanId | string | null | undefined,
  feature:
    | "supportsPublicJoin"
    | "supportsStaffCheckIn"
    | "supportsManualAdjustments"
    | "supportsRewardRedemption"
    | "supportsFeaturedRewards"
    | "supportsCustomTiers"
    | "supportsStreakBonuses"
    | "supportsReferralPointTriggers"
    | "supportsQuestPointTriggers"
    | "supportsAdvancedRewardAnalytics"
    | "supportsMultiLocationRewards",
): boolean {
  return Boolean(getRewardCircleCapabilities(planId)[feature]);
}