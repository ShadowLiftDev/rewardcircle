import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth-server";
import { getRewardCircleWalletByPhone } from "@/lib/rewardcircle/core-server";

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
  phone?: string;
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
  if (message === "Unauthorized") return 401;
  if (message === "Missing or invalid authorization.") return 401;
  if (message === "Forbidden") return 403;

  if (message === "Missing orgId.") return 400;
  if (message === "Phone is required.") return 400;
  if (message === "Invalid phone number.") return 400;

  return 500;
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

// -----------------------------------------------------------------------------
// POST — staff lookup for existing RewardCircle member/wallet
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

    const body = (await req.json().catch(() => ({}))) as LookupBody;

    if (!body.phone) {
      throw new Error("Phone is required.");
    }

    const phone = normalizePhoneToE164US(body.phone);

    if (!phone) {
      throw new Error("Invalid phone number.");
    }

    const result = await getRewardCircleWalletByPhone(orgId, phone);
    const state = normalizeWalletResult(result);

    if (!state) {
      return noStoreJson(
        {
          found: false,
          error:
            "No RewardCircle wallet was found for that contact. Ask the customer to join RewardCircle first.",
        },
        {
          status: 404,
        },
      );
    }

    return noStoreJson(
      {
        found: true,
        role,
        member: buildMemberResponse(state),
        wallet: buildWalletResponse(state),
      },
      {
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("[rewardcircle:staff:customer:lookup:POST] error:", error);

    const message =
      error?.message || "Failed to look up RewardCircle customer.";

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