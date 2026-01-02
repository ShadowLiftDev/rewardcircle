import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getLockedOrgId } from "@/lib/org-server";   // 🔥 NEW

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type LookupBody = {
  phone?: string;
  email?: string;
};

type TierKey = "tier1" | "tier2" | "tier3" | "tier4";

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

function getDefaultProgramSettings(): ProgramSettings {
  return {
    pointsPerDollar: 1,
    tierThresholds: {
      tier1: 0,
      tier2: 500,
      tier3: 1000,
      tier4: 2000,
    },
    tierNames: {},
    streakConfig: {
      enabled: true,
      windowDays: 2,
      bonusPoints: 50,
      minVisitsForBonus: 3,
    },
  };
}

function buildProgramFromOrgData(data: any): ProgramSettings {
  const ps = (data.programSettings || {}) as Partial<ProgramSettings>;

  return {
    pointsPerDollar: ps.pointsPerDollar ?? 1,
    tierThresholds: {
      tier1: ps.tierThresholds?.tier1 ?? 0,
      tier2: ps.tierThresholds?.tier2 ?? 500,
      tier3: ps.tierThresholds?.tier3 ?? 1000,
      ...(ps.tierThresholds?.tier4 != null
        ? { tier4: ps.tierThresholds.tier4 }
        : {}),
    },
    tierNames: ps.tierNames ?? {},
    streakConfig: {
      enabled: ps.streakConfig?.enabled ?? true,
      windowDays: ps.streakConfig?.windowDays ?? 2,
      bonusPoints: ps.streakConfig?.bonusPoints ?? 50,
      minVisitsForBonus: ps.streakConfig?.minVisitsForBonus ?? 3,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    // 🔥 ORG LOCK — ignore URL — always Neon Lunchbox
    const orgId = getLockedOrgId();
    const org = String(orgId);

    const body = (await req.json().catch(() => ({}))) as LookupBody;
    const rawPhone = String(body.phone ?? "").trim();
    const rawEmail = String(body.email ?? "").trim();

    const phone = rawPhone || undefined;
    const email = rawEmail ? rawEmail.toLowerCase() : undefined;

    if (!phone && !email) {
      return NextResponse.json(
        { error: "phone or email is required." },
        { status: 400 }
      );
    }

    // 1) Load program settings
    const orgRef = adminDb.doc(`orgs/${org}`);
    const orgSnap = await orgRef.get();

    let program: ProgramSettings = getDefaultProgramSettings();
    if (orgSnap.exists) {
      const data = orgSnap.data() as any;
      if (data.programSettings) {
        program = buildProgramFromOrgData(data);
      }
    }

    // 2) Lookup customer
    const customersCol = adminDb.collection(
      `orgs/${org}/loyaltyCustomers`
    );

    let cSnap;
    if (phone) {
      cSnap = await customersCol.where("phone", "==", phone).limit(1).get();
    } else {
      cSnap = await customersCol.where("email", "==", email).limit(1).get();
    }

    if (cSnap.empty) {
      return NextResponse.json(
        {
          found: false,
          error:
            "We couldn’t find a wallet for that contact. Ask staff to add points for you first.",
        },
        { status: 404 }
      );
    }

    const cDoc = cSnap.docs[0];
    const cData = cDoc.data() as any;

    const customer = {
      id: cDoc.id,
      name: cData.name ?? (phone || email || "Guest"),
      phone: cData.phone,
      email: cData.email,
      pointsBalance: cData.pointsBalance ?? 0,
      lifetimePoints: cData.lifetimePoints ?? 0,
      currentTier: (cData.currentTier ?? "tier1") as TierKey,
      streakCount: cData.streakCount ?? 0,
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
          pointsCost:
            typeof ddata.pointsCost === "number" ? ddata.pointsCost : 0,
          active: ddata.active !== false,
          sortOrder: typeof ddata.sortOrder === "number" ? ddata.sortOrder : 9999,
        };
      })
      .filter((r) => r.active);

    return NextResponse.json(
      {
        found: true,
        customer,
        program,
        rewards,
      },
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  } catch (e: any) {
    console.error("[loyalty:customer:lookup] error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to load wallet." },
      { status: 500 }
    );
  }
}