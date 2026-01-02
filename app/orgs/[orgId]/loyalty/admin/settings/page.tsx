import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser, requireRole } from "@/lib/auth-server";
import { getLockedOrgId } from "@/lib/org-server";   // 🔥 enforce single-org mode

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProgramSettings = {
  pointsPerDollar: number;
  tierThresholds: {
    tier1: number;
    tier2: number;
    tier3: number;
    tier4?: number;
  };
  tierNames?: {
    tier1?: string;
    tier2?: string;
    tier3?: string;
    tier4?: string;
  };
  streakConfig: {
    enabled: boolean;
    windowDays: number;
    bonusPoints: number;
    minVisitsForBonus: number;
  };
};

function withDefaults(raw: any): ProgramSettings {
  const ps = raw || {};
  const th = ps.tierThresholds || {};
  const tn = ps.tierNames || {};
  const sc = ps.streakConfig || {};

  return {
    pointsPerDollar:
      typeof ps.pointsPerDollar === "number" ? ps.pointsPerDollar : 1,

    tierThresholds: {
      tier1: typeof th.tier1 === "number" ? th.tier1 : 0,
      tier2: typeof th.tier2 === "number" ? th.tier2 : 500,
      tier3: typeof th.tier3 === "number" ? th.tier3 : 1000,
      ...(typeof th.tier4 === "number" ? { tier4: th.tier4 } : {}),
    },

    tierNames: {
      tier1: tn.tier1,
      tier2: tn.tier2,
      tier3: tn.tier3,
      tier4: tn.tier4,
    },

    streakConfig: {
      enabled: sc.enabled ?? true,
      windowDays: sc.windowDays ?? 2,
      bonusPoints: sc.bonusPoints ?? 50,
      minVisitsForBonus: sc.minVisitsForBonus ?? 3,
    },
  };
}

// ============================================================
// 🔹 GET – load program settings (owner only)
// ============================================================
export async function GET(req: NextRequest) {
  try {
    // 🔥 override param-based org
    const orgId = getLockedOrgId();

    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner"], req);

    const orgRef = adminDb.doc(`orgs/${orgId}`);
    const snap = await orgRef.get();

    const rawSettings = snap.exists ? (snap.data() as any).programSettings : {};
    const program = withDefaults(rawSettings);

    return NextResponse.json(
      { program },
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  } catch (e: any) {
    console.error("[loyalty:admin:settings:GET] error:", e);
    const msg = e?.message || "Failed to load program settings.";
    const status = msg === "Forbidden" ? 403 : 500;

    return NextResponse.json({ error: msg }, { status });
  }
}

// ============================================================
// 🔹 POST – save program settings (owner only)
// ============================================================
export async function POST(req: NextRequest) {
  try {
    // 🔥 override URL orgId
    const orgId = getLockedOrgId();

    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner"], req);

    const body = (await req.json().catch(() => ({}))) as {
      programSettings?: any;
    };

    const program = withDefaults(body.programSettings ?? body);

    const orgRef = adminDb.doc(`orgs/${orgId}`);
    await orgRef.set({ programSettings: program }, { merge: true });

    return NextResponse.json(
      { ok: true, program },
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  } catch (e: any) {
    console.error("[loyalty:admin:settings:POST] error:", e);
    const msg = e?.message || "Failed to save program settings.";
    const status = msg === "Forbidden" ? 403 : 500;

    return NextResponse.json({ error: msg }, { status });
  }
}