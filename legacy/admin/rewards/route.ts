import { NextRequest, NextResponse } from "next/server";
import { adminDb, FieldValue } from "@/lib/firebase-admin";
import { requireUser, requireRole } from "@/lib/auth-server";
import { getLockedOrgId } from "@/lib/org-server";  // 🔥 server-safe single-org lock

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RewardBody = {
  id?: string;
  name?: string;
  description?: string;
  pointsCost?: number;
  sortOrder?: number;
  active?: boolean;
};

type RewardRow = {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  active: boolean;
  sortOrder: number;
};

const REWARDS_COLLECTION = "loyaltyRewards";

// ================================================================
// 🔹 GET – list rewards (owner only)
// ================================================================
export async function GET(req: NextRequest) {
  try {
    // 🔥 Always override orgId from params
    const orgId = getLockedOrgId();

    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner"], req);

    const snap = await adminDb
      .collection(`orgs/${orgId}/${REWARDS_COLLECTION}`)
      .orderBy("sortOrder", "asc")
      .get();

    const rewards: RewardRow[] = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        name: data.name ?? "Reward",
        description: data.description ?? "",
        pointsCost: typeof data.pointsCost === "number" ? data.pointsCost : 0,
        active: data.active !== false,
        sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
      };
    });

    return NextResponse.json(
      { rewards },
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  } catch (e: any) {
    console.error("[loyalty:admin:rewards:GET] error:", e);
    const msg = e?.message || "Failed to load rewards.";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// ================================================================
// 🔹 POST – create reward (owner only)
// ================================================================
export async function POST(req: NextRequest) {
  try {
    const orgId = getLockedOrgId();

    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner"], req);

    const body = (await req.json().catch(() => ({}))) as RewardBody;
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const pointsCost = Number(body.pointsCost ?? NaN);
    const sortOrder = Number(body.sortOrder ?? 0);
    const active = body.active !== false;

    if (!name) {
      return NextResponse.json(
        { error: "Reward name is required." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(pointsCost) || pointsCost <= 0) {
      return NextResponse.json(
        { error: "Points cost must be a positive number." },
        { status: 400 }
      );
    }

    const col = adminDb.collection(`orgs/${orgId}/${REWARDS_COLLECTION}`);

    const docRef = await col.add({
      name,
      description,
      pointsCost,
      sortOrder,
      active,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        ok: true,
        reward: {
          id: docRef.id,
          name,
          description,
          pointsCost,
          active,
          sortOrder,
        } as RewardRow,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[loyalty:admin:rewards:POST] error:", e);
    const msg = e?.message || "Failed to create reward.";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// ================================================================
// 🔹 PATCH – update reward (owner only)
// ================================================================
export async function PATCH(req: NextRequest) {
  try {
    const orgId = getLockedOrgId();

    const user = await requireUser(req);
    await requireRole(orgId, user.uid, ["owner"], req);

    const body = (await req.json().catch(() => ({}))) as RewardBody;

    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json(
        { error: "Reward id is required." },
        { status: 400 }
      );
    }

    const update: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.name != null) update.name = String(body.name).trim();
    if (body.description != null) update.description = String(body.description).trim();

    if (body.pointsCost != null) {
      const cost = Number(body.pointsCost);
      if (!Number.isFinite(cost) || cost <= 0) {
        return NextResponse.json(
          { error: "Points cost must be a positive number." },
          { status: 400 }
        );
      }
      update.pointsCost = cost;
    }

    if (body.sortOrder != null) {
      update.sortOrder = Number(body.sortOrder) || 0;
    }

    if (body.active != null) {
      update.active = !!body.active;
    }

    const ref = adminDb.doc(`orgs/${orgId}/${REWARDS_COLLECTION}/${id}`);
    await ref.update(update);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[loyalty:admin:rewards:PATCH] error:", e);
    const msg = e?.message || "Failed to update reward.";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}