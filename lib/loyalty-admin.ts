import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  updateDoc,
  query,
} from "firebase/firestore";

import { getClientDb, getClientAuth } from "./firebase-client";
import type {
  Org,
  Customer,
  Transaction,
  ProgramSettings,
} from "./types";
import {
  getOrgProgramSettings,
} from "./loyalty";

export type LoyaltyDashboardStats = {
  totalCustomers: number;
  customersWithBalance: number;
  totalPointsOutstanding: number;
  totalTransactions: number;
  totalPointsEarned: number;   // sum of positive points
  totalPointsRedeemed: number; // absolute sum of negative points
};

/**
 * Fetches the org doc and returns it with a fully-hydrated ProgramSettings
 * (using getOrgProgramSettings to fill defaults if needed).
 */
export async function getOrgWithProgram(
  orgId: string,
): Promise<{ org: Org; program: ProgramSettings }> {
  const orgRef = doc(getClientDb(), "orgs", orgId);
  const snap = await getDoc(orgRef);

  if (!snap.exists()) {
    throw new Error("Org not found.");
  }

  const data = snap.data() as any;

  const program = await getOrgProgramSettings(orgId);

  const org: Org = {
    id: snap.id,
    name: data.name ?? "Unnamed Org",
    slug: data.slug ?? orgId,
    logoUrl: data.logoUrl,
    createdAt: data.createdAt?.toDate?.().toISOString?.() ?? "",
    isActive: data.isActive !== false,
    programSettings: program,
  };

  return { org, program };
}

/**
 * Computes simple aggregate stats from loyaltyCustomers + loyaltyTransactions.
 * NOTE: For very large datasets you’d replace this with Cloud Functions
 * that maintain counters. For v2 scale, this is fine.
 */
export async function getLoyaltyDashboardStats(
  orgId: string,
): Promise<LoyaltyDashboardStats> {
  const customersCol = collection(getClientDb(), "orgs", orgId, "loyaltyCustomers");
  const txCol = collection(getClientDb(), "orgs", orgId, "loyaltyTransactions");

  const [customersSnap, txSnap] = await Promise.all([
    getDocs(customersCol),
    getDocs(query(txCol, orderBy("createdAt", "desc"), limit(500))),
  ]);

  let totalCustomers = 0;
  let customersWithBalance = 0;
  let totalPointsOutstanding = 0;

  customersSnap.forEach((docSnap) => {
    const c = docSnap.data() as any;
    totalCustomers += 1;

    const balance = c.pointsBalance ?? 0;
    totalPointsOutstanding += balance;
    if (balance > 0) customersWithBalance += 1;
  });

  let totalTransactions = 0;
  let totalPointsEarned = 0;
  let totalPointsRedeemed = 0;

  txSnap.forEach((docSnap) => {
    const t = docSnap.data() as any;
    totalTransactions += 1;

    const pts = typeof t.points === "number" ? t.points : 0;
    if (pts > 0) totalPointsEarned += pts;
    if (pts < 0) totalPointsRedeemed += Math.abs(pts);
  });

  return {
    totalCustomers,
    customersWithBalance,
    totalPointsOutstanding,
    totalTransactions,
    totalPointsEarned,
    totalPointsRedeemed,
  };
}

/**
 * Recent transaction list, useful for an activity feed or admin “Activity” tab.
 */
export async function getRecentLoyaltyTransactions(
  orgId: string,
  count = 25,
): Promise<Transaction[]> {
  const txCol = collection(getClientDb(), "orgs", orgId, "loyaltyTransactions");
  const snap = await getDocs(
    query(txCol, orderBy("createdAt", "desc"), limit(count)),
  );

  const rows: Transaction[] = snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      customerId: data.customerId,
      type: data.type ?? "earn",
      points: data.points ?? 0,
      staffId: data.staffId ?? undefined,
      rewardId: data.rewardId ?? undefined,
      purchaseAmount: data.purchaseAmount ?? undefined,
      note: data.note ?? undefined,
      createdAt: data.createdAt?.toDate?.().toISOString?.() ?? "",
    };
  });

  return rows;
}

export async function fetchProgramSettingsForOrg(
  orgId: string,
): Promise<ProgramSettings> {
  const auth = getClientAuth();
  const user = auth.currentUser;

  const headers: HeadersInit = {};

  // In prod / real login, include Firebase ID token
  if (user) {
    const token = await user.getIdToken();
    headers["authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`/api/orgs/${orgId}/loyalty/admin/settings`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Failed to load program settings (${res.status}).`);
  }

  return data.program as ProgramSettings;
}

export async function saveProgramSettingsForOrg(
  orgId: string,
  settings: ProgramSettings,
): Promise<void> {
  const auth = getClientAuth();
  const user = auth.currentUser;

  const headers: HeadersInit = {
    "content-type": "application/json",
  };

  // In prod / real login, include Firebase ID token
  if (user) {
    const token = await user.getIdToken();
    headers["authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`/api/orgs/${orgId}/loyalty/admin/settings`, {
    method: "POST",
    headers,
    body: JSON.stringify({ programSettings: settings }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Failed to save program settings (${res.status}).`);
  }
}