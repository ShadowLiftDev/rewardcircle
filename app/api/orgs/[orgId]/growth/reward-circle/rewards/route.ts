import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth-server";
import {
  createRewardCircleReward,
  getRewardCircleAdminRewards,
  updateRewardCircleReward,
  type RewardCircleRewardWriteInput,
} from "@/lib/rewardcircle/admin-server";

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

type RewardRouteBody = RewardCircleRewardWriteInput & {
  rewardId?: string;
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

function errorStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Missing or invalid authorization.") return 401;
  if (message === "Forbidden") return 403;
  if (message === "Missing orgId.") return 400;
  if (message === "Reward title is required.") return 400;
  if (message === "Reward id is required.") return 400;
  if (message === "Points cost must be a positive number.") return 400;
  if (message === "Reward not found.") return 404;
  return 500;
}

function normalizeRewardInput(body: RewardRouteBody): RewardCircleRewardWriteInput {
  return {
    rewardId:
      body.rewardId != null ? String(body.rewardId).trim() : undefined,

    title:
      body.title != null ? String(body.title).trim() : undefined,

    description:
      body.description != null ? String(body.description).trim() : undefined,

    pointsCost:
      body.pointsCost != null ? Number(body.pointsCost) : undefined,

    status: body.status,

    isPublic:
      body.isPublic != null ? Boolean(body.isPublic) : undefined,

    isFeatured:
      body.isFeatured != null ? Boolean(body.isFeatured) : undefined,

    category:
      body.category != null ? String(body.category).trim() : undefined,

    imageUrl:
      body.imageUrl != null ? String(body.imageUrl).trim() : undefined,

    redemptionInstructions:
      body.redemptionInstructions != null
        ? String(body.redemptionInstructions).trim()
        : undefined,

    internalNotes:
      body.internalNotes != null
        ? String(body.internalNotes).trim()
        : undefined,

    sortOrder:
      body.sortOrder != null ? Number(body.sortOrder) : undefined,

    startsAt: body.startsAt,
    endsAt: body.endsAt,
  };
}

// -----------------------------------------------------------------------------
// GET — list RewardCircle rewards
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const orgId = await resolveOrgId(context);

    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner", "admin"], req);

    const rewards = await getRewardCircleAdminRewards(orgId);

    return noStoreJson(
      {
        rewards,
      },
      {
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("[rewardcircle:rewards:GET] error:", error);

    const message = error?.message || "Failed to load RewardCircle rewards.";

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

// -----------------------------------------------------------------------------
// POST — create RewardCircle reward
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const orgId = await resolveOrgId(context);

    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner", "admin"], req);

    const body = (await req.json().catch(() => ({}))) as RewardRouteBody;
    const input = normalizeRewardInput(body);

    const reward = await createRewardCircleReward(orgId, input);

    return noStoreJson(
      {
        ok: true,
        reward,
      },
      {
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("[rewardcircle:rewards:POST] error:", error);

    const message = error?.message || "Failed to create RewardCircle reward.";

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

// -----------------------------------------------------------------------------
// PATCH — update RewardCircle reward
// -----------------------------------------------------------------------------

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const orgId = await resolveOrgId(context);

    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner", "admin"], req);

    const body = (await req.json().catch(() => ({}))) as RewardRouteBody;

    const rewardId = String(body.rewardId ?? "").trim();

    if (!rewardId) {
      throw new Error("Reward id is required.");
    }

    const input = normalizeRewardInput(body);

    const reward = await updateRewardCircleReward(orgId, rewardId, input);

    return noStoreJson(
      {
        ok: true,
        reward,
      },
      {
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("[rewardcircle:rewards:PATCH] error:", error);

    const message = error?.message || "Failed to update RewardCircle reward.";

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