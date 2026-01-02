import { NextRequest, NextResponse } from "next/server";
import { adminDb, FieldValue } from "@/lib/firebase-admin";
import { requireUser, requireRole } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrgParams = { orgId: string };

type EarnBody = {
  phone?: string;
  name?: string;
  purchaseAmount?: number;
};

// --- Helpers (mirrors lib/loyalty.ts, but server-side-safe) ---

function todayISO() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

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

async function getOrgProgramSettingsServer(
  orgId: string,
): Promise<ProgramSettings> {
  const orgRef = adminDb.doc(`orgs/${orgId}`);
  const snap = await orgRef.get();

  if (!snap.exists) return getDefaultProgramSettings();

  const data = snap.data() as any;
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

function calculateTier(
  lifetimePoints: number,
  thresholds: ProgramSettings["tierThresholds"],
): TierKey {
  if (thresholds.tier4 && lifetimePoints >= thresholds.tier4) return "tier4";
  if (lifetimePoints >= thresholds.tier3) return "tier3";
  if (lifetimePoints >= thresholds.tier2) return "tier2";
  return "tier1";
}

function updateStreak(
  currentStreak: number,
  lastVisitDate: string | undefined,
  streakConfig: ProgramSettings["streakConfig"],
): { newStreak: number; streakBonus: number } {
  if (!streakConfig.enabled) {
    return { newStreak: currentStreak, streakBonus: 0 };
  }

  const today = new Date(todayISO());
  if (!lastVisitDate) {
    // first visit
    return { newStreak: 1, streakBonus: 0 };
  }

  const last = new Date(lastVisitDate);
  const diffDays = Math.floor(
    (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    // same day, no change
    return { newStreak: currentStreak, streakBonus: 0 };
  }

  if (diffDays <= streakConfig.windowDays) {
    const nextStreak = currentStreak + 1;
    const eligible = nextStreak >= streakConfig.minVisitsForBonus;
    return {
      newStreak: nextStreak,
      streakBonus: eligible ? streakConfig.bonusPoints : 0,
    };
  }

  // streak broken
  return { newStreak: 1, streakBonus: 0 };
}

// --- Route: staff earn points ---

export async function POST(
  req: NextRequest,
  context: { params: Promise<OrgParams> },
) {
  try {
    const { orgId } = await context.params;
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    // 1) Auth + role check (staff/owner only)
    const user = await requireUser(req);
    const role = await requireRole(orgId, user.uid, ["owner", "staff"], req);

    // 2) Parse body
    const body = (await req.json().catch(() => ({}))) as EarnBody;
    const phone = String(body.phone ?? "").trim();
    const name = String(body.name ?? "").trim() || undefined;
    const purchaseAmount = Number(body.purchaseAmount ?? NaN);

    if (!phone || !Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
      return NextResponse.json(
        { error: "phone and purchaseAmount are required." },
        { status: 400 },
      );
    }

    const org = String(orgId);

    // 3) Load program settings
    const programSettings = await getOrgProgramSettingsServer(org);
    const earnPoints = Math.round(
      purchaseAmount * (programSettings.pointsPerDollar ?? 1),
    );

    // 4) Find or create customer by phone (server-side version)
    const customersCol = adminDb.collection(
      `orgs/${org}/loyaltyCustomers`,
    );

    const existing = await customersCol
      .where("phone", "==", phone)
      .limit(1)
      .get();

    let customerRef = existing.empty
      ? customersCol.doc()
      : existing.docs[0].ref;

    let customerData: any;

    if (existing.empty) {
      const now = FieldValue.serverTimestamp();
      customerData = {
        name: name ?? phone,
        phone,
        joinedAt: now,
        pointsBalance: 0,
        lifetimePoints: 0,
        currentTier: "tier1" as TierKey,
        streakCount: 0,
        lastVisitDate: null,
        lastActivityAt: now,
      };
      await customerRef.set(customerData, { merge: true });
    } else {
      customerData = existing.docs[0].data();
    }

    const currentPoints = customerData.pointsBalance ?? 0;
    const lifetimePoints = customerData.lifetimePoints ?? 0;
    const streakCount = customerData.streakCount ?? 0;
    const lastVisitDate =
      typeof customerData.lastVisitDate === "string"
        ? customerData.lastVisitDate
        : undefined;

    // 5) Streak + tier logic
    const { newStreak, streakBonus } = updateStreak(
      streakCount,
      lastVisitDate,
      programSettings.streakConfig,
    );

    const totalEarned = earnPoints + streakBonus;
    const newLifetime = lifetimePoints + totalEarned;
    const newBalance = currentPoints + totalEarned;
    const newTier = calculateTier(newLifetime, programSettings.tierThresholds);

    const now = FieldValue.serverTimestamp();

    // 6) Write updates (customer + transaction)
    const txCol = adminDb.collection(
      `orgs/${org}/loyaltyTransactions`,
    );
    const txDoc = txCol.doc();

    await adminDb.runTransaction(async (tx) => {
      tx.set(
        customerRef,
        {
          name: name ?? customerData.name ?? phone,
          phone,
          pointsBalance: newBalance,
          lifetimePoints: newLifetime,
          currentTier: newTier,
          streakCount: newStreak,
          lastVisitDate: todayISO(),
          lastActivityAt: now,
        },
        { merge: true },
      );

      tx.set(txDoc, {
        customerId: customerRef.id,
        type: "earn",
        points: totalEarned,
        purchaseAmount,
        staffId: user.uid,
        note: streakBonus > 0 ? "Includes streak bonus" : null,
        createdAt: now,
      });
    });

    return NextResponse.json(
      {
        ok: true,
        role,
        customerId: customerRef.id,
        newBalance,
        newLifetime,
        newTier,
        newStreak,
        streakBonus,
        earnedBase: earnPoints,
      },
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      },
    );
  } catch (e: any) {
    console.error("[loyalty:earn] error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to add points." },
      { status: 500 },
    );
  }
}