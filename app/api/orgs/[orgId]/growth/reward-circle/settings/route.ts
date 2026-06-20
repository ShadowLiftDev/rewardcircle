import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth-server";
import {
  getRewardCircleSettings,
  saveRewardCircleSettingsForOrg,
  type RewardCircleSettingsPayload,
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

function isSettingsPayload(value: unknown): value is RewardCircleSettingsPayload {
  if (!value || typeof value !== "object") return false;

  const payload = value as Partial<RewardCircleSettingsPayload>;

  return Boolean(payload.config && payload.activeProgram);
}

function errorStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden") return 403;
  if (message === "Missing orgId.") return 400;
  return 500;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const orgId = await resolveOrgId(context);

    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner", "admin"], req);

    const settings = await getRewardCircleSettings(orgId);

    return noStoreJson(settings, { status: 200 });
  } catch (error: any) {
    console.error("[rewardcircle:settings:GET] error:", error);

    const message = error?.message || "Failed to load RewardCircle settings.";

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

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const orgId = await resolveOrgId(context);

    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner", "admin"], req);

    const body = (await req.json().catch(() => null)) as unknown;

    if (!isSettingsPayload(body)) {
      return noStoreJson(
        {
          error:
            "Invalid RewardCircle settings payload. Expected { config, activeProgram }.",
        },
        {
          status: 400,
        }
      );
    }

    const settings = await saveRewardCircleSettingsForOrg(orgId, body);

    return noStoreJson(
      {
        ok: true,
        settings,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[rewardcircle:settings:POST] error:", error);

    const message = error?.message || "Failed to save RewardCircle settings.";

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