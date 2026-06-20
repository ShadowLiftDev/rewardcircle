import "server-only";

import { adminDb } from "@/lib/firebase-admin";

import type {
  RewardCircleActivity,
  RewardCircleActivityType,
  RewardCircleMemberState,
  RewardCircleProgram,
  RewardCircleProgramConfig,
  RewardCirclePublicProgramInfo,
  RewardCircleReward,
  RewardCircleStaffActionResult,
  RewardCircleTierConfig,
} from "./types";

const DEFAULT_PROGRAM_ID = "default";

const DEFAULT_TIERS: RewardCircleTierConfig[] = [
  {
    tierId: "starter",
    name: "Starter",
    threshold: 0,
    description: "Entry loyalty tier.",
    sortOrder: 1,
  },
  {
    tierId: "intermediate",
    name: "Intermediate",
    threshold: 1000,
    description: "For returning customers building momentum.",
    sortOrder: 2,
  },
  {
    tierId: "expert",
    name: "Expert",
    threshold: 2500,
    description: "For frequent supporters.",
    sortOrder: 3,
  },
  {
    tierId: "vip",
    name: "VIP",
    threshold: 5000,
    description: "For top loyalty members.",
    sortOrder: 4,
  },
];

function nowIso(): string {
  return new Date().toISOString();
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizePhone(phone: string): string {
  return phone.trim().replace(/[^\d+]/g, "");
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function shouldReplaceGenericName(existingName: unknown): boolean {
  if (typeof existingName !== "string") return true;

  const trimmed = existingName.trim().toLowerCase();

  return (
    !trimmed ||
    trimmed === "rewardcircle member" ||
    trimmed === "reward circle member" ||
    trimmed === "member" ||
    trimmed === "customer"
  );
}

// -----------------------------------------------------------------------------
// Firestore paths
// -----------------------------------------------------------------------------

function membersCollection() {
  return adminDb.collection("members");
}

function memberRef(memberId: string) {
  return adminDb.doc(`members/${memberId}`);
}

function memberOrgLinkRef(memberId: string, orgId: string) {
  return adminDb.doc(`members/${memberId}/orgLinks/${orgId}`);
}

function rewardCircleStateRef(memberId: string, orgId: string) {
  return adminDb.doc(
    `members/${memberId}/orgLinks/${orgId}/modules/rewardcircle/state`,
  );
}

function rewardCircleConfigRef(orgId: string) {
  return adminDb.doc(`orgs/${orgId}/modules/rewardcircle/config`);
}

function rewardCircleProgramRef(orgId: string, programId: string) {
  return adminDb.doc(
    `orgs/${orgId}/modules/rewardcircle/programs/${programId}`,
  );
}

function rewardCircleRewardsCollection(orgId: string) {
  return adminDb.collection(`orgs/${orgId}/modules/rewardcircle/rewards`);
}

function rewardCircleRewardRef(orgId: string, rewardId: string) {
  return adminDb.doc(
    `orgs/${orgId}/modules/rewardcircle/rewards/${rewardId}`,
  );
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
// Config / Program
// -----------------------------------------------------------------------------

export function getDefaultRewardCircleConfig(
  orgId: string,
): RewardCircleProgramConfig {
  const now = nowIso();

  return {
    orgId,
    moduleId: "rewardcircle",
    status: "active",
    activeProgramId: DEFAULT_PROGRAM_ID,

    rewardCurrencyName: "points",

    publicHeadline: "Earn rewards every time you come back.",
    publicDescription:
      "Join the rewards circle, check in when you visit, earn points, and redeem them for available rewards.",
    howItWorksSteps: [
      "Join with your phone number.",
      "Check in when you visit.",
      "Earn points from eligible actions.",
      "Redeem points for available rewards.",
    ],

    allowPublicJoin: true,
    allowStaffLookup: true,
    allowStaffCheckIn: true,
    allowManualAdjustments: true,
    allowRewardRedemption: true,

    defaultJoinBonusPoints: 0,
    defaultPointsPerCheckIn: 10,
    defaultPointsPerDollar: 2,

    createdAt: now,
    updatedAt: now,
  };
}

export function getDefaultRewardCircleProgram(
  orgId: string,
): RewardCircleProgram {
  const now = nowIso();

  return {
    programId: DEFAULT_PROGRAM_ID,
    orgId,

    name: "Standard RewardCircle Program",
    description:
      "A simple points-based reward program for customer check-ins, loyalty actions, and redemptions.",

    status: "active",

    pointsPerCheckIn: 10,
    pointsPerDollar: 2,
    joinBonusPoints: 0,

    tiers: DEFAULT_TIERS,

    streakConfig: {
      enabled: false,
      windowDays: 2,
      bonusPoints: 50,
      minVisitsForBonus: 3,
    },

    createdAt: now,
    updatedAt: now,
  };
}

export async function getRewardCircleConfig(
  orgId: string,
): Promise<RewardCircleProgramConfig> {
  if (!orgId) throw new Error("Missing orgId.");

  const ref = rewardCircleConfigRef(orgId);
  const snap = await ref.get();

  if (snap.exists) {
    return snap.data() as RewardCircleProgramConfig;
  }

  const config = getDefaultRewardCircleConfig(orgId);
  await ref.set(config, { merge: true });

  return config;
}

export async function getActiveRewardCircleProgram(
  orgId: string,
): Promise<RewardCircleProgram> {
  if (!orgId) throw new Error("Missing orgId.");

  const config = await getRewardCircleConfig(orgId);
  const activeProgramId = config.activeProgramId || DEFAULT_PROGRAM_ID;

  const programRef = rewardCircleProgramRef(orgId, activeProgramId);
  const programSnap = await programRef.get();

  if (programSnap.exists) {
    return programSnap.data() as RewardCircleProgram;
  }

  const program = getDefaultRewardCircleProgram(orgId);
  await programRef.set(program, { merge: true });

  return program;
}

// -----------------------------------------------------------------------------
// Tier / streak logic
// -----------------------------------------------------------------------------

export function calculateRewardCircleTier(
  lifetimePointsEarned: number,
  tiers: RewardCircleTierConfig[],
): { tierId: string; tierName: string } {
  const sorted = [...tiers]
    .filter((tier) => Number.isFinite(Number(tier.threshold)))
    .sort((a, b) => a.threshold - b.threshold);

  let current = sorted[0] ?? {
    tierId: "starter",
    name: "Starter",
    threshold: 0,
  };

  for (const tier of sorted) {
    if (lifetimePointsEarned >= tier.threshold) {
      current = tier;
    }
  }

  return {
    tierId: current.tierId,
    tierName: current.name,
  };
}

function calculateRewardCircleStreak(
  currentStreak: number,
  lastVisitDate: unknown,
  streakConfig: RewardCircleProgram["streakConfig"],
): { newStreak: number; streakBonus: number } {
  if (!streakConfig?.enabled) {
    return {
      newStreak: currentStreak,
      streakBonus: 0,
    };
  }

  const today = new Date(todayIsoDate());

  if (typeof lastVisitDate !== "string" || !lastVisitDate) {
    return {
      newStreak: 1,
      streakBonus: 0,
    };
  }

  const last = new Date(lastVisitDate);

  const diffDays = Math.floor(
    (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return {
      newStreak: currentStreak,
      streakBonus: 0,
    };
  }

  if (diffDays <= streakConfig.windowDays) {
    const nextStreak = currentStreak + 1;
    const eligible = nextStreak >= streakConfig.minVisitsForBonus;

    return {
      newStreak: nextStreak,
      streakBonus: eligible ? streakConfig.bonusPoints : 0,
    };
  }

  return {
    newStreak: 1,
    streakBonus: 0,
  };
}

// -----------------------------------------------------------------------------
// Member lookup / creation
// -----------------------------------------------------------------------------

export type RewardCircleMemberLookupResult = {
  memberId: string;
  member?: Record<string, unknown>;
  memberState?: RewardCircleMemberState;
};

export async function findRewardCircleMemberByPhone(
  orgId: string,
  phone: string,
): Promise<RewardCircleMemberLookupResult | null> {
  const normalizedPhone = normalizePhone(phone);

  if (!orgId) throw new Error("Missing orgId.");
  if (!normalizedPhone) return null;

  const snap = await membersCollection()
    .where("phone", "==", normalizedPhone)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const memberDoc = snap.docs[0];
  const memberId = memberDoc.id;

  const stateSnap = await rewardCircleStateRef(memberId, orgId).get();

  return {
    memberId,
    member: memberDoc.data(),
    memberState: stateSnap.exists
      ? (stateSnap.data() as RewardCircleMemberState)
      : undefined,
  };
}

export type FindOrCreateRewardCircleMemberInput = {
  orgId: string;
  phone: string;
  displayName?: string;
  email?: string;
  staffUserId?: string;
  staffName?: string;
};

export async function findOrCreateRewardCircleMember(
  input: FindOrCreateRewardCircleMemberInput,
): Promise<RewardCircleMemberState> {
  const orgId = input.orgId;
  const phone = normalizePhone(input.phone);

  if (!orgId) throw new Error("Missing orgId.");
  if (!phone) throw new Error("Phone number is required.");

  const existing = await findRewardCircleMemberByPhone(orgId, phone);
  const now = nowIso();

  let memberId = existing?.memberId;

  if (memberId && existing?.memberState) {
    await mergeRewardCircleMemberIdentity({
      memberId,
      displayName: input.displayName,
      email: input.email,
      phone,
    });

    await touchMemberOrgLink(memberId, orgId);

    return existing.memberState;
  }

  if (!memberId) {
    const memberDoc = membersCollection().doc();

    await memberDoc.set(
      {
        name: input.displayName || "RewardCircle Member",
        phone,
        email: input.email || "",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );

    memberId = memberDoc.id;
  } else {
    await mergeRewardCircleMemberIdentity({
      memberId,
      displayName: input.displayName,
      email: input.email,
      phone,
    });
  }

  await memberOrgLinkRef(memberId, orgId).set(
    {
      orgId,
      memberId,
      joinedAt: now,
      lastActiveAt: now,
      roleType: "customer",
      tags: [],
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  const program = await getActiveRewardCircleProgram(orgId);

  const joinBonus = Math.max(0, safeNumber(program.joinBonusPoints, 0));
  const tier = calculateRewardCircleTier(joinBonus, program.tiers);

  const state: RewardCircleMemberState = {
    memberId,
    orgId,

    status: "active",

    displayName: input.displayName || "RewardCircle Member",
    phone,
    email: input.email || "",

    pointsBalance: joinBonus,
    lifetimePointsEarned: joinBonus,
    lifetimePointsRedeemed: 0,

    currentTier: tier.tierId,
    currentTierName: tier.tierName,

    totalVisits: 0,
    streakCount: 0,

    welcomeGranted: joinBonus > 0,

    joinedAt: now,
    lastActivityAt: now,
    lastVisitDate: undefined,
    lastEarnedAt: joinBonus > 0 ? now : undefined,
    lastRedeemedAt: undefined,

    createdAt: now,
    updatedAt: now,
  };

  await updateRewardCircleMemberState(state);

  await writeRewardCircleActivity({
    orgId,
    memberId,
    type: "member_joined",
    pointsDelta: joinBonus || undefined,
    pointsBalanceAfter: state.pointsBalance,
    staffUserId: input.staffUserId,
    staffName: input.staffName,
    note:
      joinBonus > 0
        ? "Member joined with welcome bonus."
        : "Member joined.",
  });

  return state;
}

async function mergeRewardCircleMemberIdentity(input: {
  memberId: string;
  phone: string;
  displayName?: string;
  email?: string;
}): Promise<void> {
  const snap = await memberRef(input.memberId).get();
  const existing = snap.exists ? snap.data() ?? {} : {};

  const patch: Record<string, unknown> = {
    phone: input.phone,
    updatedAt: nowIso(),
  };

  if (input.email && !existing.email) {
    patch.email = input.email;
  }

  if (input.displayName && shouldReplaceGenericName(existing.name)) {
    patch.name = input.displayName;
  }

  await memberRef(input.memberId).set(patch, { merge: true });
}

// -----------------------------------------------------------------------------
// State / projection helpers
// -----------------------------------------------------------------------------

export async function getRewardCircleMemberState(
  memberId: string,
  orgId: string,
): Promise<RewardCircleMemberState | null> {
  if (!memberId) throw new Error("Missing memberId.");
  if (!orgId) throw new Error("Missing orgId.");

  const snap = await rewardCircleStateRef(memberId, orgId).get();

  if (!snap.exists) return null;

  return snap.data() as RewardCircleMemberState;
}

async function mirrorRewardCircleMemberStateToOrg(
  state: RewardCircleMemberState,
): Promise<void> {
  await rewardCircleMemberStateProjectionRef(
    state.orgId,
    state.memberId,
  ).set(state, { merge: true });
}

async function updateRewardCircleMemberState(
  state: RewardCircleMemberState,
): Promise<void> {
  await Promise.all([
    rewardCircleStateRef(state.memberId, state.orgId).set(state, {
      merge: true,
    }),
    mirrorRewardCircleMemberStateToOrg(state),
  ]);
}

async function touchMemberOrgLink(
  memberId: string,
  orgId: string,
): Promise<void> {
  const now = nowIso();

  await memberOrgLinkRef(memberId, orgId).set(
    {
      memberId,
      orgId,
      roleType: "customer",
      status: "active",
      lastActiveAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
}

// -----------------------------------------------------------------------------
// Activity
// -----------------------------------------------------------------------------

export type WriteRewardCircleActivityInput = {
  orgId: string;
  memberId: string;
  type: RewardCircleActivityType;

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
};

export async function writeRewardCircleActivity(
  input: WriteRewardCircleActivityInput,
): Promise<RewardCircleActivity> {
  const now = nowIso();

  const activityBase: Omit<RewardCircleActivity, "id"> = {
    moduleId: "rewardcircle",
    activityFamily: "loyalty",
    type: input.type,

    orgId: input.orgId,
    memberId: input.memberId,

    pointsDelta: input.pointsDelta,
    pointsBalanceAfter: input.pointsBalanceAfter,

    rewardId: input.rewardId,
    rewardTitle: input.rewardTitle,
    rewardPointsCost: input.rewardPointsCost,

    previousTier: input.previousTier,
    newTier: input.newTier,

    staffUserId: input.staffUserId,
    staffName: input.staffName,

    note: input.note,

    createdAt: now,
    updatedAt: now,
  };

  const ref = activitiesCollection().doc();
  await ref.set(activityBase);

  return {
    id: ref.id,
    ...activityBase,
  };
}

// -----------------------------------------------------------------------------
// Core actions
// -----------------------------------------------------------------------------

export type CheckInRewardCircleMemberInput = {
  orgId: string;
  memberId?: string;
  phone?: string;
  displayName?: string;
  email?: string;
  staffUserId?: string;
  staffName?: string;
  note?: string;
};

export async function checkInRewardCircleMember(
  input: CheckInRewardCircleMemberInput,
): Promise<RewardCircleStaffActionResult> {
  const orgId = input.orgId;

  if (!orgId) throw new Error("Missing orgId.");

  let state: RewardCircleMemberState | null = null;

  if (input.memberId) {
    state = await getRewardCircleMemberState(input.memberId, orgId);
  }

  if (!state && input.phone) {
    state = await findOrCreateRewardCircleMember({
      orgId,
      phone: input.phone,
      displayName: input.displayName,
      email: input.email,
      staffUserId: input.staffUserId,
      staffName: input.staffName,
    });
  }

  if (!state) {
    throw new Error("Unable to find or create RewardCircle member.");
  }

  const program = await getActiveRewardCircleProgram(orgId);

  const basePoints = Math.max(0, safeNumber(program.pointsPerCheckIn, 0));

  const { newStreak, streakBonus } = calculateRewardCircleStreak(
    state.streakCount,
    state.lastVisitDate,
    program.streakConfig,
  );

  const pointsEarned = basePoints + streakBonus;
  const previousTier = state.currentTier;

  const lifetimePointsEarned = state.lifetimePointsEarned + pointsEarned;
  const tier = calculateRewardCircleTier(lifetimePointsEarned, program.tiers);

  const now = nowIso();

  const updatedState: RewardCircleMemberState = {
    ...state,

    pointsBalance: state.pointsBalance + pointsEarned,
    lifetimePointsEarned,

    currentTier: tier.tierId,
    currentTierName: tier.tierName,

    totalVisits: state.totalVisits + 1,
    streakCount: newStreak,

    lastVisitDate: todayIsoDate(),
    lastActivityAt: now,
    lastEarnedAt: pointsEarned > 0 ? now : state.lastEarnedAt,

    updatedAt: now,
  };

  await updateRewardCircleMemberState(updatedState);
  await touchMemberOrgLink(updatedState.memberId, orgId);

  const activity = await writeRewardCircleActivity({
    orgId,
    memberId: updatedState.memberId,
    type: "visit_logged",
    pointsDelta: pointsEarned,
    pointsBalanceAfter: updatedState.pointsBalance,
    previousTier,
    newTier: updatedState.currentTier,
    staffUserId: input.staffUserId,
    staffName: input.staffName,
    note:
      input.note ||
      (streakBonus > 0
        ? `Member checked in. Includes ${streakBonus} streak bonus points.`
        : "Member checked in."),
  });

  if (previousTier !== updatedState.currentTier) {
    await writeRewardCircleActivity({
      orgId,
      memberId: updatedState.memberId,
      type: "tier_changed",
      previousTier,
      newTier: updatedState.currentTier,
      pointsBalanceAfter: updatedState.pointsBalance,
      staffUserId: input.staffUserId,
      staffName: input.staffName,
      note: `Tier changed from ${previousTier} to ${updatedState.currentTier}.`,
    });
  }

  return {
    ok: true,
    orgId,
    memberId: updatedState.memberId,
    memberState: updatedState,
    activity,
    message: "RewardCircle check-in recorded.",
  };
}

export type AwardRewardCirclePointsInput = {
  orgId: string;
  memberId: string;
  points?: number;
  purchaseAmount?: number;
  staffUserId?: string;
  staffName?: string;
  note?: string;
};

export async function awardRewardCirclePoints(
  input: AwardRewardCirclePointsInput,
): Promise<RewardCircleStaffActionResult> {
  const state = await getRewardCircleMemberState(input.memberId, input.orgId);

  if (!state) throw new Error("RewardCircle member state not found.");

  const program = await getActiveRewardCircleProgram(input.orgId);

  const directPoints = safeNumber(input.points, 0);
  const purchaseAmount = safeNumber(input.purchaseAmount, 0);

  const calculatedPoints =
    directPoints > 0
      ? directPoints
      : purchaseAmount * safeNumber(program.pointsPerDollar, 0);

  const safePoints = Math.max(0, Math.round(calculatedPoints));

  if (safePoints <= 0) {
    throw new Error("Points awarded must be greater than zero.");
  }

  const previousTier = state.currentTier;

  const lifetimePointsEarned = state.lifetimePointsEarned + safePoints;
  const tier = calculateRewardCircleTier(lifetimePointsEarned, program.tiers);

  const now = nowIso();

  const updatedState: RewardCircleMemberState = {
    ...state,

    pointsBalance: state.pointsBalance + safePoints,
    lifetimePointsEarned,

    currentTier: tier.tierId,
    currentTierName: tier.tierName,

    lastEarnedAt: now,
    lastActivityAt: now,

    updatedAt: now,
  };

  await updateRewardCircleMemberState(updatedState);
  await touchMemberOrgLink(updatedState.memberId, input.orgId);

  const activity = await writeRewardCircleActivity({
    orgId: input.orgId,
    memberId: input.memberId,
    type: "points_earned",
    pointsDelta: safePoints,
    pointsBalanceAfter: updatedState.pointsBalance,
    previousTier,
    newTier: updatedState.currentTier,
    staffUserId: input.staffUserId,
    staffName: input.staffName,
    note: input.note || "Points awarded.",
  });

  if (previousTier !== updatedState.currentTier) {
    await writeRewardCircleActivity({
      orgId: input.orgId,
      memberId: input.memberId,
      type: "tier_changed",
      previousTier,
      newTier: updatedState.currentTier,
      pointsBalanceAfter: updatedState.pointsBalance,
      staffUserId: input.staffUserId,
      staffName: input.staffName,
      note: `Tier changed from ${previousTier} to ${updatedState.currentTier}.`,
    });
  }

  return {
    ok: true,
    orgId: input.orgId,
    memberId: input.memberId,
    memberState: updatedState,
    activity,
    message: "RewardCircle points awarded.",
  };
}

export type AdjustRewardCirclePointsInput = {
  orgId: string;
  memberId: string;
  pointsDelta: number;
  staffUserId?: string;
  staffName?: string;
  note?: string;
};

export async function adjustRewardCirclePoints(
  input: AdjustRewardCirclePointsInput,
): Promise<RewardCircleStaffActionResult> {
  const state = await getRewardCircleMemberState(input.memberId, input.orgId);

  if (!state) throw new Error("RewardCircle member state not found.");

  const delta = Math.round(safeNumber(input.pointsDelta, 0));
  const nextBalance = Math.max(0, state.pointsBalance + delta);
  const now = nowIso();

  const updatedState: RewardCircleMemberState = {
    ...state,
    pointsBalance: nextBalance,
    lastActivityAt: now,
    updatedAt: now,
  };

  await updateRewardCircleMemberState(updatedState);
  await touchMemberOrgLink(updatedState.memberId, input.orgId);

  const activity = await writeRewardCircleActivity({
    orgId: input.orgId,
    memberId: input.memberId,
    type: "points_adjusted",
    pointsDelta: delta,
    pointsBalanceAfter: updatedState.pointsBalance,
    staffUserId: input.staffUserId,
    staffName: input.staffName,
    note: input.note || "Points adjusted.",
  });

  return {
    ok: true,
    orgId: input.orgId,
    memberId: input.memberId,
    memberState: updatedState,
    activity,
    message: "RewardCircle points adjusted.",
  };
}

export type RedeemRewardCircleRewardInput = {
  orgId: string;
  memberId: string;
  rewardId: string;
  staffUserId?: string;
  staffName?: string;
  note?: string;
};

export async function redeemRewardCircleReward(
  input: RedeemRewardCircleRewardInput,
): Promise<RewardCircleStaffActionResult> {
  const state = await getRewardCircleMemberState(input.memberId, input.orgId);

  if (!state) throw new Error("RewardCircle member state not found.");

  const rewardSnap = await rewardCircleRewardRef(
    input.orgId,
    input.rewardId,
  ).get();

  if (!rewardSnap.exists) {
    throw new Error("Reward not found.");
  }

  const reward = rewardSnap.data() as RewardCircleReward;
  const rewardId = reward.rewardId || rewardSnap.id;

  if (reward.status !== "active" || !reward.isPublic) {
    throw new Error("Reward is not currently available.");
  }

  const pointsCost = Math.max(0, safeNumber(reward.pointsCost, 0));

  if (pointsCost <= 0) {
    throw new Error("Reward has no points cost configured.");
  }

  if (state.pointsBalance < pointsCost) {
    throw new Error("Not enough points to redeem this reward.");
  }

  const now = nowIso();

  const updatedState: RewardCircleMemberState = {
    ...state,

    pointsBalance: state.pointsBalance - pointsCost,
    lifetimePointsRedeemed: state.lifetimePointsRedeemed + pointsCost,

    lastRedeemedAt: now,
    lastActivityAt: now,

    updatedAt: now,
  };

  await updateRewardCircleMemberState(updatedState);
  await touchMemberOrgLink(updatedState.memberId, input.orgId);

  const activity = await writeRewardCircleActivity({
    orgId: input.orgId,
    memberId: input.memberId,
    type: "reward_redeemed",
    pointsDelta: -pointsCost,
    pointsBalanceAfter: updatedState.pointsBalance,
    rewardId,
    rewardTitle: reward.title,
    rewardPointsCost: pointsCost,
    staffUserId: input.staffUserId,
    staffName: input.staffName,
    note: input.note || `Redeemed reward: ${reward.title}`,
  });

  return {
    ok: true,
    orgId: input.orgId,
    memberId: input.memberId,
    memberState: updatedState,
    activity,
    message: "Reward redeemed.",
  };
}

// -----------------------------------------------------------------------------
// Wallet / public info
// -----------------------------------------------------------------------------

export type RewardCircleWallet = {
  memberState: RewardCircleMemberState;
  program: RewardCircleProgram;
  tierLabel: string;
};

export async function getRewardCircleWalletByPhone(
  orgId: string,
  phone: string,
): Promise<RewardCircleWallet | null> {
  const found = await findRewardCircleMemberByPhone(orgId, phone);

  if (!found?.memberState) return null;

  const program = await getActiveRewardCircleProgram(orgId);

  return {
    memberState: found.memberState,
    program,
    tierLabel:
      found.memberState.currentTierName ||
      found.memberState.currentTier ||
      "Starter",
  };
}

export async function getPublicRewardCircleProgramInfo(
  orgId: string,
): Promise<RewardCirclePublicProgramInfo> {
  const config = await getRewardCircleConfig(orgId);
  const program = await getActiveRewardCircleProgram(orgId);

  const rewardsSnap = await rewardCircleRewardsCollection(orgId)
    .where("status", "==", "active")
    .where("isPublic", "==", true)
    .orderBy("sortOrder", "asc")
    .limit(6)
    .get();

  const featuredRewards = rewardsSnap.docs.map((docSnap) => {
    const data = docSnap.data() as RewardCircleReward;

    return {
      ...data,
      rewardId: data.rewardId || docSnap.id,
      orgId: data.orgId || orgId,
    };
  });

return {
  orgId,
  programName: program.name,
  headline: config.publicHeadline,
  description: config.publicDescription,
  rewardCurrencyName: config.rewardCurrencyName,
  howItWorksSteps: config.howItWorksSteps,
  joinCallToAction: "Join RewardCircle",
  tiers: program.tiers ?? [],
  featuredRewards,
};
}