import { NextRequest, NextResponse } from "next/server";
import { adminDb, FieldValue } from "@/lib/firebase-admin";
import { requireUser, requireRole } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrgParams = { orgId: string };

type RedeemBody = {
  customerId?: string;
  rewardId?: string;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<OrgParams> },
) {
  try {
    const { orgId } = await context.params;
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    // 1) Auth + role
    const user = await requireUser(req);
    const role = await requireRole(orgId, user.uid, ["owner", "staff"], req);

    // 2) Body
    const body = (await req.json().catch(() => ({}))) as RedeemBody;
    const customerId = String(body.customerId ?? "").trim();
    const rewardId = String(body.rewardId ?? "").trim();

    if (!customerId || !rewardId) {
      return NextResponse.json(
        { error: "customerId and rewardId are required." },
        { status: 400 },
      );
    }

    const org = String(orgId);

    const customerRef = adminDb.doc(
      `orgs/${org}/loyaltyCustomers/${customerId}`,
    );
    const rewardRef = adminDb.doc(
      `orgs/${org}/loyaltyRewards/${rewardId}`,
    );
    const txCol = adminDb.collection(
      `orgs/${org}/loyaltyTransactions`,
    );

    const now = FieldValue.serverTimestamp();

    const result = await adminDb.runTransaction(async (tx) => {
      const [cSnap, rSnap] = await Promise.all([
        tx.get(customerRef),
        tx.get(rewardRef),
      ]);

      if (!cSnap.exists) {
        throw new Error("Customer not found.");
      }
      if (!rSnap.exists) {
        throw new Error("Reward not found.");
      }

      const cData = cSnap.data() as any;
      const rData = rSnap.data() as any;

      const currentBalance: number = cData.pointsBalance ?? 0;
      const cost: number =
        typeof rData.pointsCost === "number" ? rData.pointsCost : 0;

      if (cost <= 0) {
        throw new Error("Reward has no points cost configured.");
      }
      if (currentBalance < cost) {
        throw new Error("Customer does not have enough points for this reward.");
      }

      const newBalance = currentBalance - cost;
      const txDoc = txCol.doc();

      tx.update(customerRef, {
        pointsBalance: newBalance,
        lastActivityAt: now,
        lastRedeemedAt: now,
        lastRewardId: rewardId,
      });

      tx.set(txDoc, {
        customerId,
        rewardId,
        type: "redeem",
        points: -cost,
        staffId: user.uid,
        createdAt: now,
      });

      return { newBalance, cost, rewardName: rData.name ?? "Reward" };
    });

    return NextResponse.json(
      {
        ok: true,
        role,
        customerId,
        rewardId,
        newBalance: result.newBalance,
        costPoints: result.cost,
        rewardName: result.rewardName,
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
    console.error("[loyalty:redeem] error:", e);
    const msg = e?.message || "Redeem failed.";
    const status =
      msg === "Customer not found." || msg === "Reward not found."
        ? 404
        : msg.includes("not have enough points")
        ? 400
        : 500;

    return NextResponse.json({ error: msg }, { status });
  }
}