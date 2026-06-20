export type OwnerOpticsPlanId = "core" | "growth" | "scale";

// -----------------------------------------------------------------------------
// Shared timestamp type
// -----------------------------------------------------------------------------
// Keeps this file flexible across Firestore server/client usage.

export type RewardCircleTimestamp =
  | string
  | number
  | Date
  | {
      seconds: number;
      nanoseconds: number;
    }
  | null;

// -----------------------------------------------------------------------------
// RewardCircle constants / identity
// -----------------------------------------------------------------------------

export type RewardCircleModuleId = "rewardcircle";

export type RewardCircleActivityFamily = "loyalty";

export type RewardCircleStatus = "active" | "inactive" | "archived";

export type RewardCircleMemberStatus = "active" | "inactive" | "banned";

export type RewardCircleRewardStatus =
  | "draft"
  | "active"
  | "inactive"
  | "archived";

export type RewardCircleProgramStatus =
  | "draft"
  | "active"
  | "paused"
  | "archived";

// -----------------------------------------------------------------------------
// RewardCircle activity
// -----------------------------------------------------------------------------
// Live state belongs in member state.
// History belongs in activity.
//
// Firestore target:
// activities/{activityId}
//
// RewardCircle defaults:
// moduleId: "rewardcircle"
// activityFamily: "loyalty"

export type RewardCircleActivityType =
  | "member_joined"
  | "visit_logged"
  | "points_earned"
  | "points_redeemed"
  | "points_adjusted"
  | "reward_redeemed"
  | "tier_changed"
  | "welcome_bonus_granted";

export interface RewardCircleActivity {
  id: string;

  moduleId: RewardCircleModuleId;
  activityFamily: RewardCircleActivityFamily;
  type: RewardCircleActivityType;

  orgId: string;
  memberId: string;

  pointsDelta?: number;
  pointsBalanceAfter?: number;

  rewardId?: string;
  rewardTitle?: string;
  rewardPointsCost?: number;

  previousTier?: string;
  newTier?: string;

  staffUserId?: string;
  staffName?: string;

  note?: string;

  createdAt: RewardCircleTimestamp;
  updatedAt?: RewardCircleTimestamp;
}

// -----------------------------------------------------------------------------
// RewardCircle tiers
// -----------------------------------------------------------------------------

export interface RewardCircleTierConfig {
  tierId: string;
  name: string;
  threshold: number;

  description?: string;
  badgeLabel?: string;
  sortOrder?: number;

  createdAt?: RewardCircleTimestamp;
  updatedAt?: RewardCircleTimestamp;
}

// -----------------------------------------------------------------------------
// RewardCircle program config
// -----------------------------------------------------------------------------
// Firestore target:
// orgs/{orgId}/modules/rewardcircle/config
//
// This is the org-level module configuration.
// It does not own platform pricing.

export interface RewardCircleProgramConfig {
  orgId: string;

  moduleId: RewardCircleModuleId;

  status: RewardCircleStatus;

  activeProgramId: string;

  rewardCurrencyName: string; // usually "points"

  publicHeadline: string;
  publicDescription: string;
  howItWorksSteps: string[];

  allowPublicJoin: boolean;
  allowStaffLookup: boolean;
  allowStaffCheckIn: boolean;
  allowManualAdjustments: boolean;
  allowRewardRedemption: boolean;

  defaultJoinBonusPoints: number;
  defaultPointsPerCheckIn: number;
  defaultPointsPerDollar: number;

  createdAt: RewardCircleTimestamp;
  updatedAt: RewardCircleTimestamp;
}

// -----------------------------------------------------------------------------
// RewardCircle program
// -----------------------------------------------------------------------------
// Firestore target:
// orgs/{orgId}/modules/rewardcircle/programs/{programId}
//
// For launch, we can operate with one active/default program.
// This type remains ready for multiple programs later.

export interface RewardCircleProgram {
  programId: string;
  orgId: string;

  name: string;
  description?: string;

  status: RewardCircleProgramStatus;

  pointsPerCheckIn: number;
  pointsPerDollar: number;
  joinBonusPoints: number;

  tiers: RewardCircleTierConfig[];

  streakConfig?: {
    enabled: boolean;
    windowDays: number;
    bonusPoints: number;
    minVisitsForBonus: number;
  };

  createdAt: RewardCircleTimestamp;
  updatedAt: RewardCircleTimestamp;
}

// -----------------------------------------------------------------------------
// RewardCircle member state
// -----------------------------------------------------------------------------
// Firestore target:
// members/{memberId}/orgLinks/{orgId}/modules/rewardcircle/state
//
// ProfileMatrix/global members own identity.
// RewardCircle owns the loyalty state for this member inside this org.

export interface RewardCircleMemberState {
  memberId: string;
  orgId: string;

  status: RewardCircleMemberStatus;

  // Optional denormalized display fields for RewardCircle screens.
  // Source of truth remains members/{memberId}.
  displayName?: string;
  phone?: string;
  email?: string;

  pointsBalance: number;
  lifetimePointsEarned: number;
  lifetimePointsRedeemed: number;

  currentTier: string;
  currentTierName?: string;

  totalVisits: number;
  streakCount: number;

  welcomeGranted: boolean;

  joinedAt: RewardCircleTimestamp;
  lastActivityAt?: RewardCircleTimestamp;
  lastVisitDate?: RewardCircleTimestamp;
  lastEarnedAt?: RewardCircleTimestamp;
  lastRedeemedAt?: RewardCircleTimestamp;

  createdAt: RewardCircleTimestamp;
  updatedAt: RewardCircleTimestamp;
}

// -----------------------------------------------------------------------------
// RewardCircle rewards
// -----------------------------------------------------------------------------
// Firestore target:
// orgs/{orgId}/modules/rewardcircle/rewards/{rewardId}

export interface RewardCircleReward {
  rewardId: string;
  orgId: string;

  title: string;
  description?: string;

  pointsCost: number;

  status: RewardCircleRewardStatus;

  isPublic: boolean;
  isFeatured: boolean;

  category?: string;
  imageUrl?: string;

  redemptionInstructions?: string;
  internalNotes?: string;

  sortOrder?: number;

  startsAt?: RewardCircleTimestamp;
  endsAt?: RewardCircleTimestamp;

  createdAt: RewardCircleTimestamp;
  updatedAt: RewardCircleTimestamp;
}

// -----------------------------------------------------------------------------
// RewardCircle staff action
// -----------------------------------------------------------------------------
// Used by staff surfaces and core engine functions.
// This is not necessarily stored directly as-is.
// It describes what staff is trying to do.

export type RewardCircleStaffActionType =
  | "join_or_find_member"
  | "check_in"
  | "earn_points"
  | "redeem_reward"
  | "adjust_points";

export interface RewardCircleStaffActionInput {
  orgId: string;
  staffUserId?: string;
  staffName?: string;

  memberId?: string;

  phone?: string;
  email?: string;
  displayName?: string;

  actionType: RewardCircleStaffActionType;

  pointsDelta?: number;
  purchaseAmount?: number;

  rewardId?: string;

  note?: string;
}

export interface RewardCircleStaffActionResult {
  ok: boolean;

  orgId: string;
  memberId: string;

  memberState: RewardCircleMemberState;

  activity?: RewardCircleActivity;

  message?: string;
  error?: string;
}

// -----------------------------------------------------------------------------
// RewardCircle admin customer summary
// -----------------------------------------------------------------------------
// Used for HQ/admin customer tables.
// This is a read model, not the canonical live state.

export interface RewardCircleAdminCustomerSummary {
  memberId: string;
  orgId: string;

  displayName: string;
  phone?: string;
  email?: string;

  status: RewardCircleMemberStatus;

  pointsBalance: number;
  lifetimePointsEarned: number;
  lifetimePointsRedeemed: number;

  currentTier: string;
  currentTierName?: string;

  totalVisits: number;
  streakCount: number;

  joinedAt: RewardCircleTimestamp;
  lastActivityAt?: RewardCircleTimestamp;
  lastVisitDate?: RewardCircleTimestamp;
  lastRedeemedAt?: RewardCircleTimestamp;
}

// -----------------------------------------------------------------------------
// RewardCircle overview summary
// -----------------------------------------------------------------------------
// Used by NeonHQ / Growth / RewardCircle overview surfaces.
// This summarizes posture. It does not own the engine.

export interface RewardCircleOverviewSummary {
  orgId: string;

  planId: OwnerOpticsPlanId;

  status: RewardCircleStatus;

  totalMembers: number;
  activeMembers: number;

  totalPointsOutstanding: number;
  lifetimePointsEarned: number;
  lifetimePointsRedeemed: number;

  totalVisits: number;
  totalRewardsRedeemed: number;

  activeRewards: number;
  featuredRewards: number;

  recentActivity: RewardCircleActivity[];

  topRewards: Array<{
    rewardId: string;
    title: string;
    redemptionCount: number;
    pointsCost: number;
  }>;

  updatedAt: RewardCircleTimestamp;
}

// -----------------------------------------------------------------------------
// RewardCircle capabilities
// -----------------------------------------------------------------------------
// NeonHQ determines the org's paid plan.
// RewardCircle uses that plan to enforce module-level limits.

export interface RewardCircleCapabilitySet {
  planId: OwnerOpticsPlanId;

  maxCustomerRecords: number;
  maxActiveRewards: number;
  maxPrograms: number;

  supportsPublicJoin: boolean;
  supportsStaffCheckIn: boolean;
  supportsManualAdjustments: boolean;
  supportsRewardRedemption: boolean;

  supportsFeaturedRewards: boolean;
  supportsCustomTiers: boolean;
  supportsStreakBonuses: boolean;

  supportsReferralPointTriggers: boolean;
  supportsQuestPointTriggers: boolean;

  supportsAdvancedRewardAnalytics: boolean;
  supportsMultiLocationRewards: boolean;
}

// -----------------------------------------------------------------------------
// Public explanation model
// -----------------------------------------------------------------------------
// Supports a simple public-facing page explaining how rewards work.

export interface RewardCirclePublicProgramInfo {
  orgId: string;

  programName: string;
  headline: string;
  description: string;

  rewardCurrencyName: string;

  howItWorksSteps: string[];

  joinCallToAction: string;

  tiers: RewardCircleTierConfig[];

  featuredRewards?: RewardCircleReward[];
}