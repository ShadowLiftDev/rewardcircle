import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getPublicRewardCircleProgramInfo } from "@/lib/rewardcircle/core-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params:
    | {
        orgId?: string;
      }
    | Promise<{
        orgId?: string;
      }>;
};

type LookupBody = {
  type?: "phone" | "email";
  value?: string;
  phone?: string;
  email?: string;
};

type PublicTier = {
  tierId: string;
  name: string;
  threshold: number;
  badgeLabel?: string;
  description?: string;
  sortOrder: number;
};

type TierProgressResponse = {
  currentTier: string;
  currentTierName: string;
  currentThreshold: number;
  nextTier: string | null;
  nextTierName: string | null;
  nextThreshold: number | null;
  progressPercent: number;
  pointsToNextTier: number;
};

function noStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);

  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

async function resolveOrgId(context: RouteContext) {
  const params = await context.params;
  const orgId = String(params?.orgId ?? "").trim();

  if (!orgId) {
    throw new Error("Missing orgId.");
  }

  return orgId;
}

function cleanString(value: unknown, max = 180): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function normalizeEmail(value: unknown): string | null {
  const email = cleanString(value, 180)?.toLowerCase();
  return email && email.includes("@") ? email : null;
}

function normalizePhone(value: unknown): string | null {
  const raw = cleanString(value, 40);
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 10) return `+${digits}`;

  return null;
}

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text || null;
}

function toMillis(value: unknown): number {
  if (!value) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (
    typeof value === "object" &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  if (typeof value === "object") {
    const maybeTimestamp = value as {
      seconds?: number;
      nanoseconds?: number;
      _seconds?: number;
      _nanoseconds?: number;
    };

    const seconds =
      typeof maybeTimestamp.seconds === "number"
        ? maybeTimestamp.seconds
        : typeof maybeTimestamp._seconds === "number"
          ? maybeTimestamp._seconds
          : null;

    if (seconds != null) {
      const nanos =
        typeof maybeTimestamp.nanoseconds === "number"
          ? maybeTimestamp.nanoseconds
          : typeof maybeTimestamp._nanoseconds === "number"
            ? maybeTimestamp._nanoseconds
            : 0;

      return seconds * 1000 + Math.floor(nanos / 1e6);
    }
  }

  return 0;
}

function maskEmail(email: string | null) {
  if (!email || !email.includes("@")) return null;

  const [name, domain] = email.split("@");
  const visible = name.slice(0, 2);

  return `${visible}${name.length > 2 ? "•••" : "•"}@${domain}`;
}

function maskPhone(phone: string | null) {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••";

  return `•••-•••-${digits.slice(-4)}`;
}

function normalizePublicTiers(rawTiers: unknown): PublicTier[] {
  const list = Array.isArray(rawTiers) ? rawTiers : [];

  return list
    .map((raw: any, index) => {
      const name = safeString(raw?.name, `Tier ${index + 1}`);

      return {
        tierId: safeString(raw?.tierId, `tier-${index + 1}`),
        name,
        threshold: safeNumber(raw?.threshold, 0),
        badgeLabel: raw?.badgeLabel
          ? safeString(raw.badgeLabel, name)
          : undefined,
        description: raw?.description
          ? safeString(raw.description, "")
          : undefined,
        sortOrder: safeNumber(raw?.sortOrder, index + 1),
      };
    })
    .sort((a, b) => {
      if (a.threshold !== b.threshold) return a.threshold - b.threshold;
      return a.sortOrder - b.sortOrder;
    });
}

function defaultPublicTier(): PublicTier {
  return {
    tierId: "starter",
    name: "Starter",
    threshold: 0,
    badgeLabel: "Starter",
    description: "Your RewardCircle journey starts here.",
    sortOrder: 1,
  };
}

function buildTierProgress(
  state: Record<string, any>,
  tiers: PublicTier[],
): TierProgressResponse {
  const lifetimePointsEarned = safeNumber(state?.lifetimePointsEarned, 0);
  const safeTiers = tiers.length > 0 ? tiers : [defaultPublicTier()];

  const current =
    [...safeTiers]
      .reverse()
      .find((tier) => lifetimePointsEarned >= tier.threshold) ?? safeTiers[0];

  const next =
    safeTiers.find((tier) => tier.threshold > lifetimePointsEarned) ?? null;

  const currentThreshold = current?.threshold ?? 0;
  const nextThreshold = next?.threshold ?? null;

  const progressPercent =
    nextThreshold && nextThreshold > currentThreshold
      ? Math.max(
          0,
          Math.min(
            100,
            ((lifetimePointsEarned - currentThreshold) /
              (nextThreshold - currentThreshold)) *
              100,
          ),
        )
      : 100;

  return {
    currentTier: current?.tierId ?? state?.currentTier ?? "starter",
    currentTierName:
      current?.badgeLabel ||
      current?.name ||
      state?.currentTierName ||
      "Starter",
    currentThreshold,
    nextTier: next?.tierId ?? null,
    nextTierName: next ? next.badgeLabel || next.name : null,
    nextThreshold,
    progressPercent,
    pointsToNextTier: nextThreshold
      ? Math.max(0, nextThreshold - lifetimePointsEarned)
      : 0,
  };
}

function buildMemberResponse(
  memberId: string,
  member: Record<string, any>,
  orgLink: Record<string, any>,
  rewardState: Record<string, any>,
) {
  const displayName =
    toStringOrNull(rewardState.displayName) ||
    toStringOrNull(member.displayName) ||
    toStringOrNull(member.name) ||
    "RewardCircle Member";

  const phone =
    toStringOrNull(rewardState.phone) || toStringOrNull(member.phone);

  const email =
    toStringOrNull(rewardState.email) || toStringOrNull(member.email);

  return {
    memberId,
    displayName,
    phone: maskPhone(phone),
    email: maskEmail(email),
    roleType: toStringOrNull(orgLink.roleType) ?? "customer",
    orgStatus: toStringOrNull(orgLink.status) ?? "active",
    referralCode: toStringOrNull(orgLink.referralCode),
  };
}

function buildWalletResponse(state: Record<string, any>) {
  return {
    status: toStringOrNull(state.status) ?? "active",

    pointsBalance: safeNumber(state.pointsBalance, 0),
    lifetimePointsEarned: safeNumber(state.lifetimePointsEarned, 0),
    lifetimePointsRedeemed: safeNumber(state.lifetimePointsRedeemed, 0),

    currentTier: toStringOrNull(state.currentTier) ?? "starter",
    currentTierName: toStringOrNull(state.currentTierName) ?? "Starter",

    totalVisits: safeNumber(state.totalVisits, 0),
    streakCount: safeNumber(state.streakCount, 0),

    welcomeGranted: Boolean(state.welcomeGranted),

    joinedAtMs: toMillis(state.joinedAt),
    lastActivityAtMs: toMillis(state.lastActivityAt),
    lastVisitDateMs: toMillis(state.lastVisitDate),
    lastEarnedAtMs: toMillis(state.lastEarnedAt),
    lastRedeemedAtMs: toMillis(state.lastRedeemedAt),

    createdAtMs: toMillis(state.createdAt),
    updatedAtMs: toMillis(state.updatedAt),
  };
}

function errorStatus(message: string) {
  if (message === "Missing orgId.") return 400;
  if (message === "Phone or email is required.") return 400;
  if (message === "Invalid phone number.") return 400;
  if (message === "Invalid email address.") return 400;
  if (message === "Member not found.") return 404;
  if (message === "Multiple matching member records found.") return 409;
  if (message === "Member is not linked to this organization.") return 404;
  if (message === "Member relationship is not active.") return 403;
  if (message === "RewardCircle wallet was not found.") return 404;
  return 500;
}

async function resolveLookupInput(body: LookupBody) {
  const explicitType = cleanString(body.type, 20);
  const explicitValue = cleanString(body.value, 180);

  if (explicitType === "email" || body.email) {
    const emailNormalized = normalizeEmail(explicitValue ?? body.email);

    if (!emailNormalized) {
      throw new Error("Invalid email address.");
    }

    return {
      type: "email" as const,
      field: "emailNormalized" as const,
      value: emailNormalized,
    };
  }

  if (explicitType === "phone" || body.phone || explicitValue) {
    const phoneNormalized = normalizePhone(explicitValue ?? body.phone);

    if (!phoneNormalized) {
      throw new Error("Invalid phone number.");
    }

    return {
      type: "phone" as const,
      field: "phoneNormalized" as const,
      value: phoneNormalized,
    };
  }

  throw new Error("Phone or email is required.");
}

async function findOrgLinkedMember({
  orgId,
  lookupField,
  lookupValue,
}: {
  orgId: string;
  lookupField: "phoneNormalized" | "emailNormalized";
  lookupValue: string;
}) {
  const memberSnap = await adminDb
    .collection("members")
    .where(lookupField, "==", lookupValue)
    .limit(10)
    .get();

  if (memberSnap.empty) {
    throw new Error("Member not found.");
  }

  const matches = [];

  for (const memberDoc of memberSnap.docs) {
    const orgLinkRef = memberDoc.ref.collection("orgLinks").doc(orgId);
    const orgLinkSnap = await orgLinkRef.get();

    if (!orgLinkSnap.exists) continue;

    const orgLink = orgLinkSnap.data() || {};
    const status = toStringOrNull(orgLink.status) ?? "inactive";

    if (status !== "active") {
      continue;
    }

    matches.push({
      memberId: memberDoc.id,
      member: memberDoc.data() || {},
      orgLink,
      orgLinkRef,
    });
  }

  if (matches.length === 0) {
    throw new Error("Member is not linked to this organization.");
  }

  if (matches.length > 1) {
    throw new Error("Multiple matching member records found.");
  }

  return matches[0];
}

// -----------------------------------------------------------------------------
// POST — explicit RewardCircle wallet lookup by phone/email
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const orgId = await resolveOrgId(context);
    const body = (await req.json().catch(() => ({}))) as LookupBody;

    const lookup = await resolveLookupInput(body);

    const { memberId, member, orgLink, orgLinkRef } = await findOrgLinkedMember({
      orgId,
      lookupField: lookup.field,
      lookupValue: lookup.value,
    });

    const rewardCircleStateRef = orgLinkRef
      .collection("modules")
      .doc("rewardcircle")
      .collection("state")
      .doc("current");

    const [rewardCircleStateSnap, publicProgram] = await Promise.all([
      rewardCircleStateRef.get(),
      getPublicRewardCircleProgramInfo(orgId),
    ]);

    if (!rewardCircleStateSnap.exists) {
      throw new Error("RewardCircle wallet was not found.");
    }

    const rewardState = rewardCircleStateSnap.data() || {};
    const tiers = normalizePublicTiers(publicProgram.tiers);
    const tierProgress = buildTierProgress(rewardState, tiers);

    return noStoreJson(
      {
        found: true,
        authenticated: false,

        lookup: {
          type: lookup.type,
          matched: true,
        },

        member: buildMemberResponse(memberId, member, orgLink, rewardState),
        wallet: buildWalletResponse(rewardState),

        program: {
          orgId: publicProgram.orgId,
          programName: publicProgram.programName,
          headline: publicProgram.headline,
          description: publicProgram.description,
          rewardCurrencyName: publicProgram.rewardCurrencyName,
          howItWorksSteps: publicProgram.howItWorksSteps ?? [],
          joinCallToAction: publicProgram.joinCallToAction,
          tiers,
        },

        tierProgress,

        meta: {
          generatedAtMs: Date.now(),
          sourcePaths: {
            member: `members/${memberId}`,
            orgLink: `members/${memberId}/orgLinks/${orgId}`,
            rewardCircleState: `members/${memberId}/orgLinks/${orgId}/modules/rewardcircle/state/current`,
          },
          doctrine:
            "RewardCircle lookup finds an existing org-scoped member wallet by phone or email. It does not create members, sessions, or module state.",
        },
      },
      {
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("[rewardcircle:customer:lookup:POST] error:", error);

    const message = error?.message || "Failed to look up RewardCircle wallet.";

    return noStoreJson(
      {
        found: false,
        authenticated: false,
        error: message,
      },
      {
        status: errorStatus(message),
      },
    );
  }
}