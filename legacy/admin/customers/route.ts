import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser, requireRole } from "@/lib/auth-server";
import { getLockedOrgId } from "@/lib/org-server"; // 🔥 USE SERVER-SAFE ORG LOCK

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    // 🔥 Always ignore URL orgId — use locked org instead
    const orgId = getLockedOrgId();

    const user = await requireUser(req);

    // 🔐 Only owner of neon-lunchbox can view customers
    await requireRole(orgId, user.uid, ["owner"], req);

    const customersSnap = await adminDb
      .collection(`orgs/${orgId}/loyaltyCustomers`)
      .orderBy("name")
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

    return NextResponse.json(
      { customers },
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  } catch (e: any) {
    console.error("[loyalty:admin:customers:list] error:", e);
    const msg = e?.message || "Failed to load customers.";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
