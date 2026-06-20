import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth-server";
import { redeemRewardCircleReward } from "@/lib/rewardcircle/core-server";

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

type RedeemBody = {
  memberId?: string;
  rewardId?: string;
  note?: string;
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

function cleanRequiredString(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanOptionalString(value: unknown): string | undefined {
  const cleaned = String(value ?? "").trim();
  return cleaned || undefined;
}

function errorStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Missing or invalid authorization.") return 401;
  if (message === "Forbidden") return 403;

  if (message === "Missing orgId.") return 400;
  if (message === "memberId and rewardId are required.") return 400;

  if (message === "RewardCircle member state not found.") return 404;
  if (message === "Reward not found.") return 404;

  if (message === "Reward is not currently available.") return 400;
  if (message === "Reward has no points cost configured.") return 400;
  if (message === "Not enough points to redeem this reward.") return 400;

  return 500;
}

// -----------------------------------------------------------------------------
// POST — staff redeem RewardCircle reward
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const orgId = await resolveOrgId(context);

    const user = await requireUser(req);
    const role = await requireRole(
      orgId,
      user.uid,
      ["owner", "admin", "staff"],
      req,
    );

    const body = (await req.json().catch(() => ({}))) as RedeemBody;

    const memberId = cleanRequiredString(body.memberId);
    const rewardId = cleanRequiredString(body.rewardId);
    const note = cleanOptionalString(body.note);

    if (!memberId || !rewardId) {
      throw new Error("memberId and rewardId are required.");
    }

    const result = await redeemRewardCircleReward({
      orgId,
      memberId,
      rewardId,
      staffUserId: user.uid,
      note,
    });

    return noStoreJson(
      {
        ok: true,
        role,
        memberId: result.memberId,
        rewardId,
        memberState: result.memberState,
        activity: result.activity,
        message: result.message,
      },
      {
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("[rewardcircle:staff:redeem:POST] error:", error);

    const message = error?.message || "Failed to redeem RewardCircle reward.";

    return noStoreJson(
      {
        ok: false,
        error: message,
      },
      {
        status: errorStatus(message),
      },
    );
  }
}