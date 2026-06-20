import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getLockedOrgId } from "@/lib/org-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type LookupBody = {
  phone?: string;
  email?: string;
};

// NOTE: tier keys are dynamic now ("starter", "vip", etc.)
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

function getDefaultProgramSettings(): ProgramSettings {
  return {
    pointsPerDollar: 1,
    tierThresholds: { tier1: 0, tier2: 500, tier3: 1000, tier4: 2000 },
    tierNames: {},
    streakConfig: {
      enabled: true,
      windowDays: 2,
      bonusPoints: 50,
      minVisitsForBonus: 3,
    },
  };
}

function digitsOnly(s: string) {
  return (s ?? "").replace(/\D/g, "");
}

/**
 * Normalize common US inputs to E.164:
 * - "5556667777" -> "+15556667777"
 * - "(555) 666-7777" -> "+15556667777"
 * - "+1 (555) 666-7777" -> "+15556667777"
 * - "15556667777" -> "+15556667777"
 */
function normalizePhoneToE164US(raw?: string): string | null {
  const input = String(raw ?? "").trim();
  if (!input) return null;

  const d = digitsOnly(input);
  if (!d) return null;

  // Keep last 10 digits as national number (covers "1XXXXXXXXXX", "XXXXXXXXXX", or longer garbage)
  const last10 = d.length >= 10 ? d.slice(-10) : "";
  if (last10.length !== 10) return null;

  return `+1${last10}`;
}

/**
 * Your real program doc shape (loyaltyPrograms/default)
 * tiers: [{ id, name, requiredPoints, multiplier }]
 * pointRules: { pointsPerDollar, pointsPerVisit }
 */
function buildProgramFromProgramDoc(data: any): ProgramSettings {
  const pointsPerDollar = Number(data?.pointRules?.pointsPerDollar ?? 1);

  const tierThresholds: Record<string, number> = {};
  const tierNames: Record<string, string> = {};

  const tiers = Array.isArray(data?.tiers) ? data.tiers : [];
  for (const t of tiers) {
    const id = String(t?.id ?? "").trim();
    if (!id) continue;
    const requiredPoints = Number(t?.requiredPoints ?? 0);
    tierThresholds[id] = Number.isFinite(requiredPoints) ? requiredPoints : 0;

    const nm = String(t?.name ?? "").trim();
    if (nm) tierNames[id] = nm;
  }

  return {
    pointsPerDollar: Number.isFinite(pointsPerDollar) ? pointsPerDollar : 1,
    tierThresholds: Object.keys(tierThresholds).length
      ? tierThresholds
      : getDefaultProgramSettings().tierThresholds,
    tierNames,
    streakConfig: getDefaultProgramSettings().streakConfig, // keep your current defaults unless you store this elsewhere
  };
}

/**
 * Try the new structure first, fall back to the legacy org.programSettings if needed.
 * Order:
 * 1) orgs/{org}/loyalty/programs/default
 * 2) orgs/{org}/loyaltyPrograms/default (if you ever used that)
 * 3) orgs/{org} programSettings (legacy)
 */
async function loadProgram(org: string): Promise<ProgramSettings> {
  const fallback = getDefaultProgramSettings();

  const tryPaths = [
    `orgs/${org}/loyaltyPrograms/default`,
  ];

  for (const path of tryPaths) {
    const snap = await adminDb.doc(path).get();
    if (snap.exists) return buildProgramFromProgramDoc(snap.data());
  }

  // legacy fallback
  const orgSnap = await adminDb.doc(`orgs/${org}`).get();
  if (orgSnap.exists) {
    const data = orgSnap.data() as any;
    if (data?.programSettings) {
      // keep your old behavior if you still have org.programSettings
      const ps = data.programSettings || {};
      return {
        pointsPerDollar: ps.pointsPerDollar ?? fallback.pointsPerDollar,
        tierThresholds: ps.tierThresholds ?? fallback.tierThresholds,
        tierNames: ps.tierNames ?? {},
        streakConfig: ps.streakConfig ?? fallback.streakConfig,
      };
    }
  }

  return fallback;
}

export async function POST(req: NextRequest) {
  try {
    const org = String(getLockedOrgId());

    const body = (await req.json().catch(() => ({}))) as LookupBody;
    const rawPhone = String(body.phone ?? "").trim();
    const rawEmail = String(body.email ?? "").trim();

    const phone = normalizePhoneToE164US(rawPhone) || undefined;
    const email = rawEmail ? rawEmail.toLowerCase() : undefined;

    if (!phone && !email) {
      return NextResponse.json(
        { error: "phone or email is required." },
        { status: 400 },
      );
    }

    // 1) Load program settings (NEW: from loyalty/programs/default)
    const program = await loadProgram(org);

    // 2) Lookup customer
    const customersCol = adminDb.collection(`orgs/${org}/loyaltyCustomers`);

    const cSnap = phone
      ? await customersCol.where("phone", "==", phone).limit(1).get()
      : await customersCol.where("email", "==", email).limit(1).get();

    if (cSnap.empty) {
      return NextResponse.json(
        {
          found: false,
          error:
            "We couldn’t find a wallet for that contact. Ask staff to add points for you first.",
        },
        { status: 404 },
      );
    }

    const cDoc = cSnap.docs[0];
    const cData = cDoc.data() as any;

    const customer = {
      id: cDoc.id,
      name: cData.name ?? (phone || email || "Guest"),
      phone: cData.phone,
      email: cData.email,
      pointsBalance: Number(cData.pointsBalance ?? 0),
      lifetimePoints: Number(cData.lifetimePoints ?? 0),
      currentTier: String(cData.currentTier ?? "starter"),
      streakCount: Number(cData.streakCount ?? 0),
    };

    // 3) Load reward store
    const rewardsCol = adminDb.collection(`orgs/${org}/loyaltyRewards`);
    const rSnap = await rewardsCol.orderBy("sortOrder", "asc").get();

    const rewards = rSnap.docs
      .map((d) => {
        const ddata = d.data() as any;
        return {
          id: d.id,
          name: ddata.name ?? "Reward",
          description: ddata.description ?? "",
          pointsCost: typeof ddata.pointsCost === "number" ? ddata.pointsCost : 0,
          active: ddata.active !== false,
          sortOrder: typeof ddata.sortOrder === "number" ? ddata.sortOrder : 9999,
        };
      })
      .filter((r) => r.active);

    return NextResponse.json(
      { found: true, customer, program, rewards },
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      },
    );
  } catch (e: any) {
    console.error("[loyalty:customer:lookup] error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to load wallet." },
      { status: 500 },
    );
  }
}
