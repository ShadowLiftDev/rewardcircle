import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import { normalizeOwnerOpticsPlanId } from "@/lib/rewardcircle/capabilities";
import { getRewardCircleOverviewSummary } from "@/lib/rewardcircle/admin-server";

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
  if (message === "Forbidden") return 403;
  if (message === "Missing orgId.") return 400;
  return 500;
}

async function resolveOrgPlanId(orgId: string) {
  const orgSnap = await adminDb.doc(`orgs/${orgId}`).get();

  if (!orgSnap.exists) {
    throw new Error("Organization not found.");
  }

  const org = orgSnap.data() ?? {};

  const rawPlanId =
    org.ownerOpticsPlanId ??
    org.planId ??
    org.plan ??
    org.subscriptionPlan ??
    org.billing?.planId ??
    org.billing?.plan ??
    "core";

  return normalizeOwnerOpticsPlanId(rawPlanId);
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const orgId = await resolveOrgId(context);

    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner", "admin"], req);

    const planId = await resolveOrgPlanId(orgId);
    const summary = await getRewardCircleOverviewSummary(orgId, planId);

    return noStoreJson(
      {
        summary,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[rewardcircle:overview:GET] error:", error);

    const message = error?.message || "Failed to load RewardCircle overview.";

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