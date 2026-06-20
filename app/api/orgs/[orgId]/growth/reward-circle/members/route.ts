import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth-server";
import { getRewardCircleAdminMembers } from "@/lib/rewardcircle/admin-server";

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

  return 500;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const orgId = await resolveOrgId(context);

    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner", "admin"], req);

    const members = await getRewardCircleAdminMembers(orgId);

    return noStoreJson(
      {
        members,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[rewardcircle:members:GET] error:", error);

    const message =
      error?.message || "Failed to load RewardCircle member wallets.";

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