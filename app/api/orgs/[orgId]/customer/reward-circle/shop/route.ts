import { NextRequest, NextResponse } from "next/server";
import { getActiveRewardCircleRewards } from "@/lib/rewardcircle/admin-server";
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

type PublicTier = {
  tierId: string;
  name: string;
  threshold: number;
  badgeLabel?: string;
  description?: string;
  sortOrder: number;
};

type PublicReward = {
  rewardId: string;
  orgId: string;

  title: string;
  description: string;

  pointsCost: number;

  category?: string;
  imageUrl?: string;

  isFeatured: boolean;

  redemptionInstructions?: string;

  sortOrder: number;

  startsAt?: unknown;
  endsAt?: unknown;
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

function resolveCount(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("count");
  const count = Number(raw ?? 25);

  if (!Number.isFinite(count) || count <= 0) {
    return 25;
  }

  return Math.min(Math.floor(count), 100);
}

function errorStatus(message: string) {
  if (message === "Missing orgId.") return 400;
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

function normalizeTierForCustomer(tier: any, index: number): PublicTier {
  const name = safeString(tier?.name, `Tier ${index + 1}`);

  return {
    tierId: safeString(tier?.tierId, `tier-${index + 1}`),
    name,
    threshold: safeNumber(tier?.threshold, 0),
    badgeLabel: tier?.badgeLabel
      ? safeString(tier.badgeLabel, name)
      : undefined,
    description: tier?.description
      ? safeString(tier.description)
      : undefined,
    sortOrder: safeNumber(tier?.sortOrder, index + 1),
  };
}

function normalizeTiersForCustomer(rawTiers: unknown): PublicTier[] {
  const list = Array.isArray(rawTiers) ? rawTiers : [];

  return list
    .map(normalizeTierForCustomer)
    .sort((a, b) => {
      if (a.threshold !== b.threshold) return a.threshold - b.threshold;
      return a.sortOrder - b.sortOrder;
    });
}

function normalizeRewardForCustomer(reward: any): PublicReward {
  return {
    rewardId: safeString(reward?.rewardId),
    orgId: safeString(reward?.orgId),

    title: safeString(reward?.title, "Reward"),
    description: safeString(reward?.description),

    pointsCost: safeNumber(reward?.pointsCost, 0),

    category: reward?.category ? safeString(reward.category) : undefined,
    imageUrl: reward?.imageUrl ? safeString(reward.imageUrl) : undefined,

    isFeatured: reward?.isFeatured === true,

    redemptionInstructions: reward?.redemptionInstructions
      ? safeString(reward.redemptionInstructions)
      : undefined,

    sortOrder: safeNumber(reward?.sortOrder, 0),

    startsAt: reward?.startsAt,
    endsAt: reward?.endsAt,
  };
}

function isRewardCurrentlyPublic(reward: any) {
  return reward?.status === "active" && reward?.isPublic !== false;
}

// -----------------------------------------------------------------------------
// GET — load public/customer-safe RewardCircle shop
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const orgId = await resolveOrgId(context);
    const count = resolveCount(req);

    const [publicProgram, activeRewards] = await Promise.all([
      getPublicRewardCircleProgramInfo(orgId),
      getActiveRewardCircleRewards(orgId, count),
    ]);

    const tiers = normalizeTiersForCustomer(publicProgram.tiers);

    const rewards = activeRewards
      .filter(isRewardCurrentlyPublic)
      .map(normalizeRewardForCustomer)
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.title.localeCompare(b.title);
      });

    const featuredRewards = rewards.filter((reward) => reward.isFeatured);

    return noStoreJson(
      {
        shop: {
          orgId,

          programName: publicProgram.programName,

          rewardCurrencyName: publicProgram.rewardCurrencyName,

          headline: publicProgram.headline,
          description: publicProgram.description,
          howItWorksSteps: publicProgram.howItWorksSteps ?? [],

          joinCallToAction: publicProgram.joinCallToAction,

          tiers,
        },

        rewards,
        featuredRewards,
      },
      {
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("[rewardcircle:customer:shop:GET] error:", error);

    const message = error?.message || "Failed to load RewardCircle shop.";

    return noStoreJson(
      {
        error: message,
      },
      {
        status: errorStatus(message),
      },
    );
  }
}