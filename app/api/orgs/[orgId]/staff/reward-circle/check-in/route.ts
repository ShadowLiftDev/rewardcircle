import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth-server";
import { checkInRewardCircleMember } from "@/lib/rewardcircle/core-server";

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

type CheckInBody = {
  memberId?: string;
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
  if (message === "memberId is required.") return 400;

  if (message === "RewardCircle member state not found.") return 404;
  if (message === "Unable to find or create RewardCircle member.") return 404;

  return 500;
}

// -----------------------------------------------------------------------------
// POST — staff check in existing RewardCircle member
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

    const body = (await req.json().catch(() => ({}))) as CheckInBody;

    const memberId = cleanRequiredString(body.memberId);
    const note = cleanOptionalString(body.note);

    if (!memberId) {
      throw new Error("memberId is required.");
    }

    const result = await checkInRewardCircleMember({
      orgId,
      memberId,
      staffUserId: user.uid,
      note,
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
    console.error("[rewardcircle:staff:check-in:POST] error:", error);

    const message = error?.message || "Failed to check in RewardCircle member.";

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