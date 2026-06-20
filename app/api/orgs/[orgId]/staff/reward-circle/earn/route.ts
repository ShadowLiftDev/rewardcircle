import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth-server";
import { awardRewardCirclePoints } from "@/lib/rewardcircle/core-server";

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

type EarnBody = {
  memberId?: string;
  purchaseAmount?: number;
  points?: number;
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

function parsePositiveNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return undefined;
  }

  return number;
}

function errorStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Missing or invalid authorization.") return 401;
  if (message === "Forbidden") return 403;

  if (message === "Missing orgId.") return 400;
  if (message === "memberId is required.") return 400;
  if (message === "Purchase amount or points are required.") return 400;
  if (message === "Purchase amount must be a positive number.") return 400;
  if (message === "Points must be a positive number.") return 400;
  if (message === "Points awarded must be greater than zero.") return 400;

  if (message === "RewardCircle member state not found.") return 404;

  return 500;
}

// -----------------------------------------------------------------------------
// POST — staff award/earn RewardCircle points for existing member
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

    const body = (await req.json().catch(() => ({}))) as EarnBody;

    const memberId = cleanRequiredString(body.memberId);

    if (!memberId) {
      throw new Error("memberId is required.");
    }

    const purchaseAmount = parsePositiveNumber(body.purchaseAmount);
    const points = parsePositiveNumber(body.points);

    if (!purchaseAmount && !points) {
      throw new Error("Purchase amount or points are required.");
    }

    if (body.purchaseAmount !== undefined && !purchaseAmount) {
      throw new Error("Purchase amount must be a positive number.");
    }

    if (body.points !== undefined && !points) {
      throw new Error("Points must be a positive number.");
    }

    const note = cleanOptionalString(body.note);

    const result = await awardRewardCirclePoints({
      orgId,
      memberId,
      points,
      purchaseAmount,
      staffUserId: user.uid,
      note:
        note ||
        (purchaseAmount
          ? `Points earned from purchase amount: $${purchaseAmount.toFixed(2)}.`
          : "Points awarded by staff."),
    });

    return noStoreJson(
      {
        ok: true,
        role,
        memberId: result.memberId,
        memberState: result.memberState,
        activity: result.activity,
        message: result.message,
      },
      {
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("[rewardcircle:staff:earn:POST] error:", error);

    const message = error?.message || "Failed to award RewardCircle points.";

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