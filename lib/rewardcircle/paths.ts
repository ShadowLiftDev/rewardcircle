import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from "firebase/firestore";
import { getClientDb } from "@/lib/firebase-client";

/**
 * RewardCircle Firestore path helpers.
 *
 * Doctrine:
 * - members/{memberId} owns global member identity.
 * - members/{memberId}/orgLinks/{orgId} owns the member's relationship to the org.
 * - members/{memberId}/orgLinks/{orgId}/modules/rewardcircle/state/current owns canonical live RewardCircle state.
 * - orgs/{orgId}/modules/rewardcircle/config/current owns RewardCircle module config.
- orgs/{orgId}/modules/rewardcircle/programs owns RewardCircle programs.
- orgs/{orgId}/modules/rewardcircle/rewards owns RewardCircle rewards.
- orgs/{orgId}/modules/rewardcircle/memberStates/{memberId} owns admin/HQ read projections.
 * - orgs/{orgId}/modules/rewardcircle/memberStates/{memberId} is an org-side read projection for admin/HQ surfaces.
 * - activities/{activityId} owns activity/history records.
 */

export function membersCollection(): CollectionReference {
  return collection(getClientDb(), "members");
}

export function memberRef(memberId: string): DocumentReference {
  return doc(getClientDb(), "members", memberId);
}

export function memberOrgLinkRef(
  memberId: string,
  orgId: string,
): DocumentReference {
  return doc(getClientDb(), "members", memberId, "orgLinks", orgId);
}

export function rewardCircleStateRef(
  memberId: string,
  orgId: string,
): DocumentReference {
  return doc(
    getClientDb(),
    "members",
    memberId,
    "orgLinks",
    orgId,
    "modules",
    "rewardcircle",
    "state",
    "current",
  );
}

export function orgRef(orgId: string): DocumentReference {
  return doc(getClientDb(), "orgs", orgId);
}

export function rewardCircleConfigRef(orgId: string): DocumentReference {
  return doc(
    getClientDb(),
    "orgs",
    orgId,
    "modules",
    "rewardcircle",
    "config",
    "current",
  );
}

export function rewardCircleProgramsCollection(
  orgId: string,
): CollectionReference {
  return collection(
    getClientDb(),
    "orgs",
    orgId,
    "modules",
    "rewardcircle",
    "programs",
  );
}

export function rewardCircleProgramRef(
  orgId: string,
  programId: string,
): DocumentReference {
  return doc(
    getClientDb(),
    "orgs",
    orgId,
    "modules",
    "rewardcircle",
    "programs",
    programId,
  );
}

export function rewardCircleRewardsCollection(
  orgId: string,
): CollectionReference {
  return collection(
    getClientDb(),
    "orgs",
    orgId,
    "modules",
    "rewardcircle",
    "rewards",
  );
}

export function rewardCircleRewardRef(
  orgId: string,
  rewardId: string,
): DocumentReference {
  return doc(
    getClientDb(),
    "orgs",
    orgId,
    "modules",
    "rewardcircle",
    "rewards",
    rewardId,
  );
}

/**
 * Org-side RewardCircle member-state projection.
 *
 * Canonical state remains:
 * members/{memberId}/orgLinks/{orgId}/modules/rewardcircle/state/current
 *
 * This projection exists so admin/HQ pages can efficiently list and summarize
 * RewardCircle members for a specific org.
 */
export function rewardCircleMemberStatesCollection(
  orgId: string,
): CollectionReference {
  return collection(
    getClientDb(),
    "orgs",
    orgId,
    "modules",
    "rewardcircle",
    "memberStates",
  );
}

export function rewardCircleMemberStateProjectionRef(
  orgId: string,
  memberId: string,
): DocumentReference {
  return doc(
    getClientDb(),
    "orgs",
    orgId,
    "modules",
    "rewardcircle",
    "memberStates",
    memberId,
  );
}

export function activitiesCollection(): CollectionReference {
  return collection(getClientDb(), "activities");
}

export function activityRef(activityId: string): DocumentReference {
  return doc(getClientDb(), "activities", activityId);
}