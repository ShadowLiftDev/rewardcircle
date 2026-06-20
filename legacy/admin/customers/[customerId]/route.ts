import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser, requireRole } from "@/lib/auth-server";
import { getLockedOrgId } from "@/lib/org-server"; // 🔥 NEW helper

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { orgId: string; customerId: string };

type CustomerDetail = {
  id: string;
  name: string;
  phone?: string;
  pointsBalance: number;
  lifetimePoints: number;
  currentTier: string;
  streakCount: number;
  lastVisitDate?: string | null;
};

type TransactionRow = {
  id: string;
  type: "earn" | "redeem" | "adjust";
  points: number;
  rewardId?: string | null;
  purchaseAmount?: number | null;
  staffId?: string | null;
  createdAt?: string | null;
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Params> },
) {
  try {
    const { customerId } = await ctx.params;

    if (!customerId) {
      return NextResponse.json(
        { error: "Missing customerId" },
        { status: 400 }
      );
    }

    // 🔥 ALWAYS override orgId
    const orgId = getLockedOrgId(); // = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID

    // Auth
    const user = await requireUser(req);

    // 🔐 Only owner of neon-lunchbox can view customers deeply
    await requireRole(orgId, user.uid, ["owner"], req);

    // Customer fetch
    const customerRef = adminDb.doc(
      `orgs/${orgId}/loyaltyCustomers/${customerId}`
    );

    const cSnap = await customerRef.get();
    if (!cSnap.exists) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 }
      );
    }

    const cData = cSnap.data() as any;

    const customer: CustomerDetail = {
      id: cSnap.id,
      name: cData.name ?? "Unknown",
      phone: cData.phone,
      pointsBalance: cData.pointsBalance ?? 0,
      lifetimePoints: cData.lifetimePoints ?? 0,
      currentTier: cData.currentTier ?? "tier1",
      streakCount: cData.streakCount ?? 0,
      lastVisitDate:
        typeof cData.lastVisitDate === "string"
          ? cData.lastVisitDate
          : null,
    };

    // Transactions
    const txSnap = await adminDb
      .collection(`orgs/${orgId}/loyaltyTransactions`)
      .where("customerId", "==", customerId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const transactions: TransactionRow[] = txSnap.docs.map((d) => {
      const t = d.data() as any;
      return {
        id: d.id,
        type: t.type ?? "earn",
        points: t.points ?? 0,
        rewardId: t.rewardId ?? null,
        purchaseAmount: t.purchaseAmount ?? null,
        staffId: t.staffId ?? null,
        createdAt: t.createdAt?.toDate?.().toISOString?.() ?? null,
      };
    });

    return NextResponse.json(
      { customer, transactions },
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  } catch (e: any) {
    console.error("[loyalty:admin:customer:detail] error:", e);
    const msg = e?.message || "Failed to load customer.";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}