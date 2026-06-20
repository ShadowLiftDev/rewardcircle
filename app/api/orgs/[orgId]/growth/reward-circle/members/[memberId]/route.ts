import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth-server";
import {
  getRewardCircleAdminMemberActivity,
  getRewardCircleAdminMemberById,
} from "@/lib/rewardcircle/admin-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params:
    | {
        orgId?: string;
        memberId?: string;
      }
    | Promise<{
        orgId?: string;
        memberId?: string;
      }>;
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

async function resolveParams(context: RouteContext) {
  const params = await context.params;

  const orgId = String(params?.orgId ?? "").trim();
  const memberId = String(params?.memberId ?? "").trim();

  if (!orgId) {
    throw new Error("Missing orgId.");
  }

  if (!memberId) {
    throw new Error("Missing memberId.");
  }

  return {
    orgId,
    memberId,
  };
}

function errorStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Missing or invalid authorization.") return 401;
  if (message === "Forbidden") return 403;
  if (message === "Missing orgId.") return 400;
  if (message === "Missing memberId.") return 400;
  if (message === "RewardCircle member not found.") return 404;

  return 500;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { orgId, memberId } = await resolveParams(context);

    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner", "admin"], req);

    const member = await getRewardCircleAdminMemberById(orgId, memberId);

    if (!member) {
      return noStoreJson(
        {
          error: "RewardCircle member not found.",
        },
        {
          status: 404,
        }
      );
    }

    const activity = await getRewardCircleAdminMemberActivity(
      orgId,
      memberId
    );

    return noStoreJson(
      {
        member,
        activity,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[rewardcircle:members:detail:GET] error:", error);

    const message =
      error?.message || "Failed to load RewardCircle member wallet.";

    return noStoreJson(
      {
        error: message,
      },
      {
        status: errorStatus(message),
      }
    );
  }
}