import "server-only";

import { adminDb } from "@/lib/firebase-admin";

import type {
  OwnerOpticsPlanId,
  RewardCircleActivity,
  RewardCircleAdminCustomerSummary,
  RewardCircleMemberState,
  RewardCircleOverviewSummary,
  RewardCircleProgram,
  RewardCircleProgramConfig,
  RewardCircleReward,
} from "./types";

export type RewardCircleSettingsPayload = {
  config: RewardCircleProgramConfig;
  activeProgram: RewardCircleProgram;
};

export type RewardCircleAdminRewardSummary = RewardCircleReward & {
  redemptionCount?: number;
};

export type RewardCircleRewardWriteInput = {
  rewardId?: string;

  title?: string;

  description?: string;

  pointsCost?: number;

  status?: RewardCircleReward["status"];

  isPublic?: boolean;
  isFeatured?: boolean;

  category?: string;
  imageUrl?: string;

  redemptionInstructions?: string;
  internalNotes?: string;

  sortOrder?: number;

  startsAt?: RewardCircleReward["startsAt"];
  endsAt?: RewardCircleReward["endsAt"];
};

// -----------------------------------------------------------------------------
// Firestore paths
// -----------------------------------------------------------------------------

function rewardCircleConfigRef(orgId: string) {
  return adminDb.doc(`orgs/${orgId}/modules/rewardcircle/config/current`)
}

function rewardCircleProgramRef(orgId: string, programId: string) {
  return adminDb.doc(
    `orgs/${orgId}/modules/rewardcircle/programs/${programId}`,
  );
}

function rewardCircleRewardsCollection(orgId: string) {
  return adminDb.collection(`orgs/${orgId}/modules/rewardcircle/rewards`);
}

function rewardCircleMemberStatesCollection(orgId: string) {
  return adminDb.collection(`orgs/${orgId}/modules/rewardcircle/memberStates`);
}

function rewardCircleMemberStateProjectionRef(orgId: string, memberId: string) {
  return adminDb.doc(
    `orgs/${orgId}/modules/rewardcircle/memberStates/${memberId}`,
  );
}

function activitiesCollection() {
  return adminDb.collection("activities");
}

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value: unknown, fallback = ""): string {
  const s = String(value ?? "").trim();
  return s || fallback;
}

function cleanOptionalString(value: unknown): string | undefined {
  const cleaned = String(value ?? "").trim();
  return cleaned || undefined;
}

function normalizeRewardStatus(
  status: unknown,
): RewardCircleReward["status"] {
  const value = String(status || "").trim().toLowerCase();

  if (
    value === "draft" ||
    value === "active" ||
    value === "inactive" ||
    value === "archived"
  ) {
    return value;
  }

  return "active";
}

function createRewardId(orgId: string) {
  return rewardCircleRewardsCollection(orgId).doc().id;
}

function defaultRewardCircleConfig(orgId: string): RewardCircleProgramConfig {
  const now = new Date().toISOString();

  return {
    orgId,
    moduleId: "rewardcircle",

    status: "active",

    activeProgramId: "default",

    rewardCurrencyName: "points",

    publicHeadline: "Earn rewards every time you come back.",
    publicDescription:
      "Join this business's RewardCircle to earn points, unlock rewards, and turn your visits into visible value.",
    howItWorksSteps: [
      "Join the RewardCircle.",
      "Earn points through eligible visits, purchases, and rewardable actions.",
      "Redeem your points for available rewards.",
    ],

    allowPublicJoin: true,
    allowStaffLookup: true,
    allowStaffCheckIn: true,
    allowManualAdjustments: true,
    allowRewardRedemption: true,

    defaultJoinBonusPoints: 0,
    defaultPointsPerCheckIn: 0,
    defaultPointsPerDollar: 1,

    createdAt: now,
    updatedAt: now,
  };
}

function defaultRewardCircleProgram(orgId: string): RewardCircleProgram {
  const now = new Date().toISOString();

  return {
    programId: "default",
    orgId,

    name: "Default RewardCircle Program",
    description: "The default RewardCircle loyalty program for this business.",

    status: "active",

    pointsPerCheckIn: 0,
    pointsPerDollar: 1,
    joinBonusPoints: 0,

    tiers: [
      {
        tierId: "starter",
        name: "Starter",
        threshold: 0,
        description: "Entry loyalty tier.",
        badgeLabel: "Starter",
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        tierId: "intermediate",
        name: "Intermediate",
        threshold: 1000,
        description: "Growing loyalty tier.",
        badgeLabel: "Intermediate",
        sortOrder: 2,
        createdAt: now,
        updatedAt: now,
      },
      {
        tierId: "expert",
        name: "Expert",
        threshold: 2500,
        description: "High-engagement loyalty tier.",
        badgeLabel: "Expert",
        sortOrder: 3,
        createdAt: now,
        updatedAt: now,
      },
      {
        tierId: "vip",
        name: "VIP",
        threshold: 5000,
        description: "Top loyalty tier.",
        badgeLabel: "VIP",
        sortOrder: 4,
        createdAt: now,
        updatedAt: now,
      },
    ],

    streakConfig: {
      enabled: true,
      windowDays: 2,
      bonusPoints: 50,
      minVisitsForBonus: 3,
    },

    createdAt: now,
    updatedAt: now,
  };
}

function toRewardCircleActivity(
  id: string,
  data: Record<string, any>,
): RewardCircleActivity {
  return {
    id,
    moduleId: "rewardcircle",
    activityFamily: "loyalty",
    type: data.type as RewardCircleActivity["type"],

    orgId: safeString(data.orgId),
    memberId: safeString(data.memberId),

    pointsDelta:
      typeof data.pointsDelta === "number" ? data.pointsDelta : undefined,
    pointsBalanceAfter:
      typeof data.pointsBalanceAfter === "number"
        ? data.pointsBalanceAfter
        : undefined,

    rewardId: typeof data.rewardId === "string" ? data.rewardId : undefined,
    rewardTitle:
      typeof data.rewardTitle === "string" ? data.rewardTitle : undefined,
    rewardPointsCost:
      typeof data.rewardPointsCost === "number"
        ? data.rewardPointsCost
        : undefined,

    previousTier:
      typeof data.previousTier === "string" ? data.previousTier : undefined,
    newTier: typeof data.newTier === "string" ? data.newTier : undefined,

    staffUserId:
      typeof data.staffUserId === "string" ? data.staffUserId : undefined,
    staffName: typeof data.staffName === "string" ? data.staffName : undefined,

    note: typeof data.note === "string" ? data.note : undefined,

    createdAt: data.createdAt as RewardCircleActivity["createdAt"],
    updatedAt: data.updatedAt as RewardCircleActivity["updatedAt"],
  };
}

function toAdminCustomerSummary(
  state: RewardCircleMemberState,
): RewardCircleAdminCustomerSummary {
  return {
    memberId: state.memberId,
    orgId: state.orgId,

    displayName: state.displayName || "RewardCircle Member",
    phone: state.phone,
    email: state.email,

    status: state.status,

    pointsBalance: safeNumber(state.pointsBalance),
    lifetimePointsEarned: safeNumber(state.lifetimePointsEarned),
    lifetimePointsRedeemed: safeNumber(state.lifetimePointsRedeemed),

    currentTier: state.currentTier || "starter",
    currentTierName: state.currentTierName,

    totalVisits: safeNumber(state.totalVisits),
    streakCount: safeNumber(state.streakCount),

    joinedAt: state.joinedAt,
    lastActivityAt: state.lastActivityAt,
    lastVisitDate: state.lastVisitDate,
    lastRedeemedAt: state.lastRedeemedAt,
  };
}

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------

export async function getRewardCircleSettings(
  orgId: string,
): Promise<RewardCircleSettingsPayload> {
  const configSnap = await rewardCircleConfigRef(orgId).get();

  const config = configSnap.exists
    ? ({
        ...defaultRewardCircleConfig(orgId),
        ...configSnap.data(),
        orgId,
      } as RewardCircleProgramConfig)
    : defaultRewardCircleConfig(orgId);

  const activeProgramId =
    safeString((config as any).activeProgramId) || "default";

  const programSnap = await rewardCircleProgramRef(
    orgId,
    activeProgramId,
  ).get();

  const activeProgram = programSnap.exists
    ? ({
        ...defaultRewardCircleProgram(orgId),
        ...programSnap.data(),
        orgId,
        programId: activeProgramId,
      } as RewardCircleProgram)
    : defaultRewardCircleProgram(orgId);

  return {
    config,
    activeProgram,
  };
}

export async function saveRewardCircleSettingsForOrg(
  orgId: string,
  payload: RewardCircleSettingsPayload,
): Promise<RewardCircleSettingsPayload> {
  const programId =
    safeString((payload.activeProgram as any)?.programId) ||
    safeString((payload.config as any)?.activeProgramId) ||
    "default";

  const now = new Date().toISOString();

  const config: RewardCircleProgramConfig = {
    ...payload.config,
    orgId,
    moduleId: "rewardcircle",
    activeProgramId: programId,
    updatedAt: now,
  } as RewardCircleProgramConfig;

  const activeProgram: RewardCircleProgram = {
    ...payload.activeProgram,
    orgId,
    programId,
    updatedAt: now,
  } as RewardCircleProgram;

  await Promise.all([
    rewardCircleConfigRef(orgId).set(config, { merge: true }),
    rewardCircleProgramRef(orgId, programId).set(activeProgram, {
      merge: true,
    }),
  ]);

  return {
    config,
    activeProgram,
  };
}

// -----------------------------------------------------------------------------
// Admin customers / members
// -----------------------------------------------------------------------------

export async function getRewardCircleAdminMembers(
  orgId: string,
  count = 100,
): Promise<RewardCircleAdminCustomerSummary[]> {
  const snap = await rewardCircleMemberStatesCollection(orgId)
    .orderBy("lastActivityAt", "desc")
    .limit(count)
    .get();

  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as RewardCircleMemberState;

    return toAdminCustomerSummary({
      ...data,
      memberId: data.memberId || docSnap.id,
      orgId: data.orgId || orgId,
    });
  });
}

export async function getRewardCircleAdminMemberById(
  orgId: string,
  memberId: string,
): Promise<RewardCircleAdminCustomerSummary | null> {
  const snap = await rewardCircleMemberStateProjectionRef(
    orgId,
    memberId,
  ).get();

  if (!snap.exists) return null;

  const data = snap.data() as RewardCircleMemberState;

  return toAdminCustomerSummary({
    ...data,
    memberId: data.memberId || memberId,
    orgId: data.orgId || orgId,
  });
}

export async function getRewardCircleAdminMemberActivity(
  orgId: string,
  memberId: string,
  count = 50,
): Promise<RewardCircleActivity[]> {
  const snap = await activitiesCollection()
    .where("orgId", "==", orgId)
    .where("moduleId", "==", "rewardcircle")
    .where("memberId", "==", memberId)
    .orderBy("createdAt", "desc")
    .limit(count)
    .get();

  return snap.docs.map((docSnap) =>
    toRewardCircleActivity(docSnap.id, docSnap.data()),
  );
}

// -----------------------------------------------------------------------------
// Rewards
// -----------------------------------------------------------------------------

export async function getRewardCircleAdminRewards(
  orgId: string,
): Promise<RewardCircleAdminRewardSummary[]> {
  const rewardsSnap = await rewardCircleRewardsCollection(orgId)
    .orderBy("sortOrder", "asc")
    .limit(100)
    .get();

  return rewardsSnap.docs.map((docSnap) => {
    const data = docSnap.data() as RewardCircleReward;

    return {
      ...data,
      rewardId: data.rewardId || docSnap.id,
      orgId: data.orgId || orgId,
    };
  });
}

export async function createRewardCircleReward(
  orgId: string,
  input: RewardCircleRewardWriteInput,
): Promise<RewardCircleAdminRewardSummary> {
  const now = new Date().toISOString();

  const rewardId = cleanOptionalString(input.rewardId) || createRewardId(orgId);

  const title = cleanOptionalString(input.title) || "";

  if (!title) {
    throw new Error("Reward title is required.");
  }

  const pointsCost = safeNumber(input.pointsCost, NaN);

  if (!Number.isFinite(pointsCost) || pointsCost <= 0) {
    throw new Error("Points cost must be a positive number.");
  }

  const reward: RewardCircleReward = {
    rewardId,
    orgId,

    title,
    description: cleanOptionalString(input.description),

    pointsCost,

    status: normalizeRewardStatus(input.status),

    isPublic: input.isPublic ?? true,
    isFeatured: input.isFeatured ?? false,

    category: cleanOptionalString(input.category),
    imageUrl: cleanOptionalString(input.imageUrl),

    redemptionInstructions: cleanOptionalString(input.redemptionInstructions),
    internalNotes: cleanOptionalString(input.internalNotes),

    sortOrder: safeNumber(input.sortOrder),

    startsAt: input.startsAt,
    endsAt: input.endsAt,

    createdAt: now,
    updatedAt: now,
  };

  await rewardCircleRewardsCollection(orgId).doc(rewardId).set(reward, {
    merge: true,
  });

  return reward;
}

export async function updateRewardCircleReward(
  orgId: string,
  rewardId: string,
  input: RewardCircleRewardWriteInput,
): Promise<RewardCircleAdminRewardSummary> {
  const id = cleanOptionalString(rewardId);

  if (!id) {
    throw new Error("Reward id is required.");
  }

  const ref = rewardCircleRewardsCollection(orgId).doc(id);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error("Reward not found.");
  }

  const update: Partial<RewardCircleReward> = {
    updatedAt: new Date().toISOString(),
  };

    if (input.title != null) {
    const title = cleanOptionalString(input.title) || "";

    if (!title) {
        throw new Error("Reward title is required.");
    }

    update.title = title;
    }

  if (input.description != null) {
    update.description = cleanOptionalString(input.description);
  }

  if (input.pointsCost != null) {
    const pointsCost = safeNumber(input.pointsCost, NaN);

    if (!Number.isFinite(pointsCost) || pointsCost <= 0) {
      throw new Error("Points cost must be a positive number.");
    }

    update.pointsCost = pointsCost;
  }

    if (input.status != null) {
    update.status = normalizeRewardStatus(input.status);
    }

  if (input.isPublic != null) {
    update.isPublic = Boolean(input.isPublic);
  }

  if (input.isFeatured != null) {
    update.isFeatured = Boolean(input.isFeatured);
  }

  if (input.category != null) {
    update.category = cleanOptionalString(input.category);
  }

  if (input.imageUrl != null) {
    update.imageUrl = cleanOptionalString(input.imageUrl);
  }

  if (input.redemptionInstructions != null) {
    update.redemptionInstructions = cleanOptionalString(
      input.redemptionInstructions,
    );
  }

  if (input.internalNotes != null) {
    update.internalNotes = cleanOptionalString(input.internalNotes);
  }

  if (input.sortOrder != null) {
    update.sortOrder = safeNumber(input.sortOrder);
  }

  if (input.startsAt !== undefined) {
    update.startsAt = input.startsAt;
  }

  if (input.endsAt !== undefined) {
    update.endsAt = input.endsAt;
  }

  await ref.set(update, { merge: true });

  const updatedSnap = await ref.get();
  const updated = updatedSnap.data() as RewardCircleReward;

  return {
    ...updated,
    rewardId: updated.rewardId || id,
    orgId: updated.orgId || orgId,
  };
}

export async function getActiveRewardCircleRewards(
  orgId: string,
  count = 25,
): Promise<RewardCircleReward[]> {
  const rewardsSnap = await rewardCircleRewardsCollection(orgId)
    .where("status", "==", "active")
    .orderBy("sortOrder", "asc")
    .limit(count)
    .get();

  return rewardsSnap.docs.map((docSnap) => {
    const data = docSnap.data() as RewardCircleReward;

    return {
      ...data,
      rewardId: data.rewardId || docSnap.id,
      orgId: data.orgId || orgId,
    };
  });
}

// -----------------------------------------------------------------------------
// Activity
// -----------------------------------------------------------------------------

export async function getRecentRewardCircleActivity(
  orgId: string,
  count = 25,
): Promise<RewardCircleActivity[]> {
  const snap = await activitiesCollection()
    .where("orgId", "==", orgId)
    .where("moduleId", "==", "rewardcircle")
    .orderBy("createdAt", "desc")
    .limit(count)
    .get();

  return snap.docs.map((docSnap) =>
    toRewardCircleActivity(docSnap.id, docSnap.data()),
  );
}

// -----------------------------------------------------------------------------
// Overview
// -----------------------------------------------------------------------------

export async function getRewardCircleOverviewSummary(
  orgId: string,
  planId: OwnerOpticsPlanId = "core",
): Promise<RewardCircleOverviewSummary> {
  const [settings, membersSnap, rewardsSnap, activitySnap] =
    await Promise.all([
      getRewardCircleSettings(orgId),

      rewardCircleMemberStatesCollection(orgId).get(),

      rewardCircleRewardsCollection(orgId).limit(250).get(),

      activitiesCollection()
        .where("orgId", "==", orgId)
        .where("moduleId", "==", "rewardcircle")
        .orderBy("createdAt", "desc")
        .limit(500)
        .get(),
    ]);

  let totalMembers = 0;
  let activeMembers = 0;
  let totalPointsOutstanding = 0;
  let lifetimePointsEarned = 0;
  let lifetimePointsRedeemed = 0;
  let totalVisits = 0;

  membersSnap.forEach((docSnap) => {
    const state = docSnap.data() as RewardCircleMemberState;

    totalMembers += 1;

    if (state.status === "active") {
      activeMembers += 1;
    }

    totalPointsOutstanding += safeNumber(state.pointsBalance);
    lifetimePointsEarned += safeNumber(state.lifetimePointsEarned);
    lifetimePointsRedeemed += safeNumber(state.lifetimePointsRedeemed);
    totalVisits += safeNumber(state.totalVisits);
  });

  let activeRewards = 0;
  let featuredRewards = 0;

  rewardsSnap.forEach((docSnap) => {
    const reward = docSnap.data() as RewardCircleReward;

    if (reward.status === "active") {
      activeRewards += 1;
    }

    if (reward.status === "active" && reward.isFeatured) {
      featuredRewards += 1;
    }
  });

  const recentActivity = activitySnap.docs.map((docSnap) =>
    toRewardCircleActivity(docSnap.id, docSnap.data()),
  );

  let totalRewardsRedeemed = 0;

  const rewardRedemptionMap = new Map<
    string,
    {
      rewardId: string;
      title: string;
      redemptionCount: number;
      pointsCost: number;
    }
  >();

  for (const activity of recentActivity) {
    if (activity.type !== "reward_redeemed") continue;

    totalRewardsRedeemed += 1;

    const rewardId = activity.rewardId || "unknown";
    const existing = rewardRedemptionMap.get(rewardId);

    if (existing) {
      existing.redemptionCount += 1;
      continue;
    }

    rewardRedemptionMap.set(rewardId, {
      rewardId,
      title: activity.rewardTitle || "Unknown Reward",
      redemptionCount: 1,
      pointsCost: safeNumber(activity.rewardPointsCost),
    });
  }

  const topRewards = Array.from(rewardRedemptionMap.values())
    .sort((a, b) => b.redemptionCount - a.redemptionCount)
    .slice(0, 5);

  return {
    orgId,
    planId,
    status: settings.config.status,

    totalMembers,
    activeMembers,

    totalPointsOutstanding,
    lifetimePointsEarned,
    lifetimePointsRedeemed,

    totalVisits,
    totalRewardsRedeemed,

    activeRewards,
    featuredRewards,

    recentActivity: recentActivity.slice(0, 25),
    topRewards,

    updatedAt: new Date().toISOString(),
  };
}