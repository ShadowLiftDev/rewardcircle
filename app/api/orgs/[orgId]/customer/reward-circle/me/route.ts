import { NextRequest, NextResponse } from "next/server";
import {
  getPublicRewardCircleProgramInfo,
  getRewardCircleWalletByPhone,
} from "@/lib/rewardcircle/core-server";

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

type MeBody = {
  phone?: string;
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

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function normalizePhoneToE164US(raw?: string): string | null {
  const input = String(raw ?? "").trim();

  if (!input) return null;

  const digits = digitsOnly(input);

  if (!digits) return null;

  const last10 = digits.length >= 10 ? digits.slice(-10) : "";

  if (last10.length !== 10) return null;

  return `+1${last10}`;
}

function errorStatus(message: string) {
  if (message === "Missing orgId.") return 400;
  if (message === "Phone is required.") return 400;
  if (message === "Invalid phone number.") return 400;
  return 500;
}

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n) ? n : fallback;
}

function safeString(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();

  return text || fallback;
}

function normalizeWalletResult(result: any) {
  if (!result) return null;

  return result.memberState || result.state || result.wallet || result;
}

function buildMemberResponse(state: any) {
  return {
    memberId: String(state.memberId ?? ""),
    displayName: state.displayName || "RewardCircle Member",
    phone: state.phone,
    email: state.email,
  };
}

function buildWalletResponse(state: any) {
  return {
    status: state.status ?? "active",

    pointsBalance: Number(state.pointsBalance ?? 0),
    lifetimePointsEarned: Number(state.lifetimePointsEarned ?? 0),
    lifetimePointsRedeemed: Number(state.lifetimePointsRedeemed ?? 0),

    currentTier: state.currentTier || "starter",
    currentTierName: state.currentTierName,

    totalVisits: Number(state.totalVisits ?? 0),
    streakCount: Number(state.streakCount ?? 0),

    joinedAt: state.joinedAt,
    lastActivityAt: state.lastActivityAt,
    lastVisitDate: state.lastVisitDate,
    lastEarnedAt: state.lastEarnedAt,
    lastRedeemedAt: state.lastRedeemedAt,
  };
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
  state: any,
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

// -----------------------------------------------------------------------------
// POST — look up member RewardCircle wallet
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const orgId = await resolveOrgId(context);

    const body = (await req.json().catch(() => ({}))) as MeBody;

    const phone = normalizePhoneToE164US(body.phone);

    if (!body.phone) {
      throw new Error("Phone is required.");
    }

    if (!phone) {
      throw new Error("Invalid phone number.");
    }

    const result = await getRewardCircleWalletByPhone(orgId, phone);
    const state = normalizeWalletResult(result);

    if (!state) {
      return noStoreJson(
        {
          found: false,
          error: "We couldn’t find a RewardCircle wallet for that contact yet.",
        },
        {
          status: 404,
        },
      );
    }

    const publicProgram = await getPublicRewardCircleProgramInfo(orgId);
    const tiers = normalizePublicTiers(publicProgram.tiers);
    const tierProgress = buildTierProgress(state, tiers);

    return noStoreJson(
      {
        found: true,
        member: buildMemberResponse(state),
        wallet: buildWalletResponse(state),
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
      },
      {
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("[rewardcircle:customer:me:POST] error:", error);

    const message = error?.message || "Failed to load RewardCircle wallet.";

    return noStoreJson(
      {
        found: false,
        error: message,
      },
      {
        status: errorStatus(message),
      },
    );
  }
}