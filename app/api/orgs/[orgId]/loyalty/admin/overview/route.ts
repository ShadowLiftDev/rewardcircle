import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser, requireRole } from "@/lib/auth-server";
import { getLockedOrgId } from "@/lib/org-server"; // 🔥 force server-side org lock

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type DashboardSummary = {
  totalCustomers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
};

type Transaction = {
  id: string;
  customerId: string;
  customerName: string;
  rewardId?: string | null;
  type: "earn" | "redeem";
  points: number;
  purchaseAmount?: number | null;
  staffId?: string | null;
  createdAt?: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
  phone?: string;
  pointsBalance: number;
  lifetimePoints: number;
  currentTier: string;
};

export async function GET(req: NextRequest) {
  try {
    // 🔥 1) Ignore URL parameters — enforce locked org
    const orgId = getLockedOrgId();

    // 🔥 2) Auth
    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner"], req);

    // 🔥 3) Fetch customers
    const customersSnap = await adminDb
      .collection(`orgs/${orgId}/loyaltyCustomers`)
      .get();

    const customers: CustomerRow[] = customersSnap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        name: data.name ?? "Unknown",
        phone: data.phone,
        pointsBalance: data.pointsBalance ?? 0,
        lifetimePoints: data.lifetimePoints ?? 0,
        currentTier: data.currentTier ?? "tier1",
      };
    });

    // Build customerId → name lookup
    const customerMap: Record<string, string> = customers.reduce(
      (acc, c) => {
        acc[c.id] = c.name;
        return acc;
      },
      {} as Record<string, string>
    );

    // 🔥 4) Fetch recent transactions
    const txSnap = await adminDb
      .collection(`orgs/${orgId}/loyaltyTransactions`)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const recent: Transaction[] = txSnap.docs.map((d) => {
      const data = d.data() as any;
      const customerId = data.customerId as string;

      return {
        id: d.id,
        customerId,
        customerName: customerMap[customerId] ?? customerId,
        rewardId: data.rewardId ?? null,
        type: data.type ?? "earn",
        points: data.points ?? 0,
        purchaseAmount: data.purchaseAmount ?? null,
        staffId: data.staffId ?? null,
        createdAt: data.createdAt?.toDate?.().toISOString?.() ?? null,
      };
    });

    // 🔥 5) Aggregate stats
    let totalIssued = 0;
    let totalRedeemed = 0;

    for (const tx of recent) {
      if (tx.type === "earn") totalIssued += tx.points;
      if (tx.type === "redeem") totalRedeemed += Math.abs(tx.points);
    }

    const summary: DashboardSummary = {
      totalCustomers: customers.length,
      totalPointsIssued: totalIssued,
      totalPointsRedeemed: totalRedeemed,
    };

    return NextResponse.json(
      { summary, recent, customers },
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  } catch (e: any) {
    console.error("[loyalty:admin:overview] error:", e);
    const msg = e?.message || "Failed to load dashboard.";
    const status = msg === "Forbidden" ? 403 : 500;

    return NextResponse.json({ error: msg }, { status });
  }
}