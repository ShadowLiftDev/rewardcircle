import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser, requireRole } from "@/lib/auth-server";
import { getLockedOrgId } from "@/lib/org-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProgramSettings = {
  pointsPerDollar: number;
  tierThresholds: Record<string, number>;
  tierNames?: Record<string, string>;
  streakConfig: {
    enabled: boolean;
    windowDays: number;
    bonusPoints: number;
    minVisitsForBonus: number;
  };
};

function defaultSettings(): ProgramSettings {
  return {
    pointsPerDollar: 1,
    tierThresholds: {
      starter: 250,
      intermediate: 1000,
      expert: 2500,
      vip: 5000,
    },
    tierNames: {
      starter: "Starter",
      intermediate: "Intermediate",
      expert: "Expert",
      vip: "VIP",
    },
    streakConfig: {
      enabled: true,
      windowDays: 2,
      bonusPoints: 50,
      minVisitsForBonus: 3,
    },
  };
}

function programRef(orgId: string) {
  return adminDb.doc(`orgs/${orgId}/loyaltyPrograms/default`);
}

function toSettings(programData: any): ProgramSettings {
  const base = defaultSettings();

  const ppd = Number(programData?.pointRules?.pointsPerDollar ?? base.pointsPerDollar);

  const tierThresholds: Record<string, number> = {};
  const tierNames: Record<string, string> = {};

  const tiers = Array.isArray(programData?.tiers) ? programData.tiers : [];
  for (const t of tiers) {
    const id = String(t?.id ?? "").trim();
    if (!id) continue;
    tierThresholds[id] = Number(t?.requiredPoints ?? 0);
    const nm = String(t?.name ?? "").trim();
    if (nm) tierNames[id] = nm;
  }

  const sc = programData?.streakConfig ?? base.streakConfig;

  return {
    pointsPerDollar: Number.isFinite(ppd) ? ppd : base.pointsPerDollar,
    tierThresholds: Object.keys(tierThresholds).length ? tierThresholds : base.tierThresholds,
    tierNames: Object.keys(tierNames).length ? tierNames : base.tierNames,
    streakConfig: {
      enabled: Boolean(sc?.enabled ?? base.streakConfig.enabled),
      windowDays: Number(sc?.windowDays ?? base.streakConfig.windowDays),
      bonusPoints: Number(sc?.bonusPoints ?? base.streakConfig.bonusPoints),
      minVisitsForBonus: Number(sc?.minVisitsForBonus ?? base.streakConfig.minVisitsForBonus),
    },
  };
}

function mergeIntoProgramDoc(existing: any, settings: ProgramSettings) {
  const current = existing ?? {};

  const pointRules = {
    ...(current.pointRules ?? {}),
    pointsPerDollar: Number(settings.pointsPerDollar ?? 1),
  };

  const existingTiers = Array.isArray(current.tiers) ? current.tiers : [];
  const existingById = new Map<string, any>();
  for (const t of existingTiers) {
    const id = String(t?.id ?? "").trim();
    if (id) existingById.set(id, t);
  }

  const ids = Object.keys(settings.tierThresholds ?? {});
  const tiers = ids.map((id) => {
    const prev = existingById.get(id) ?? {};
    const requiredPoints = Number(settings.tierThresholds[id] ?? 0);
    const name = settings.tierNames?.[id] ?? prev.name ?? id;

    return {
      ...prev,
      id,
      name,
      requiredPoints,
      multiplier: prev.multiplier ?? 1,
    };
  });

  tiers.sort((a, b) => Number(a.requiredPoints ?? 0) - Number(b.requiredPoints ?? 0));

  return {
    ...current,
    pointRules,
    tiers,
    streakConfig: settings.streakConfig ?? current.streakConfig,
    updatedAt: Date.now(), // ✅ matches your number-timestamp flow
  };
}

export async function GET(req: NextRequest) {
  try {
    const orgId = String(getLockedOrgId());

    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner"], req);

    const snap = await programRef(orgId).get();
    if (!snap.exists) {
      return NextResponse.json(defaultSettings(), { status: 200 });
    }

    return NextResponse.json(toSettings(snap.data()), { status: 200 });
  } catch (e: any) {
    console.error("[loyalty:admin:settings:GET] error:", e);
    const msg = e?.message || "Failed to load program settings.";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = String(getLockedOrgId());

    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner"], req);

    const body = (await req.json().catch(() => null)) as ProgramSettings | null;
    if (!body) {
      return NextResponse.json({ error: "Missing settings payload." }, { status: 400 });
    }

    const ref = programRef(orgId);
    const snap = await ref.get();
    const existing = snap.exists ? snap.data() : {};

    const nextDoc = mergeIntoProgramDoc(existing, body);
    await ref.set(nextDoc, { merge: true });

    // Optional: keep legacy org.programSettings for any old UI that still reads it
    await adminDb.doc(`orgs/${orgId}`).set({ programSettings: body }, { merge: true });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[loyalty:admin:settings:POST] error:", e);
    const msg = e?.message || "Failed to save program settings.";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}