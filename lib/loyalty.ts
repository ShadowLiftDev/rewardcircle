import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  addDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getClientDb } from "./firebase-client";
import { Customer, ProgramSettings } from "./types";

function todayISO() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function calculateTier(
  lifetimePoints: number,
  thresholds: ProgramSettings["tierThresholds"],
): "tier1" | "tier2" | "tier3" | "tier4" {
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

/* ------------------------------------------------------------------
 * Program settings helpers (safe defaults if org is not configured)
 * ------------------------------------------------------------------*/

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

export async function getOrgProgramSettings(
  orgId: string,
): Promise<ProgramSettings> {
  const orgSnap = await getDoc(doc(getClientDb(), "orgs", orgId));
  if (!orgSnap.exists()) {
    return getDefaultProgramSettings();
  }

  const data = orgSnap.data() as any;
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

export function getTierLabel(
  tierKey: Customer["currentTier"],
  programSettings: ProgramSettings,
): string {
  const customName = programSettings.tierNames?.[tierKey];
  if (customName && customName.trim().length > 0) {
    return customName;
  }

  switch (tierKey) {
    case "tier2":
      return "Tier 2";
    case "tier3":
      return "Tier 3";
    case "tier4":
      return "Tier 4";
    case "tier1":
    default:
      return "Tier 1";
  }
}

// Read-only lookup (no create)
export async function getCustomerByPhone(
  orgId: string,
  phone: string,
): Promise<Customer | null> {
  const customersRef = collection(getClientDb(), "orgs", orgId, "loyaltyCustomers");
  const q = query(customersRef, where("phone", "==", phone));
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  const d = docSnap.data() as any;

  return {
    id: docSnap.id,
    name: d.name ?? phone,
    email: d.email,
    phone: d.phone,
    joinedAt: d.joinedAt?.toDate?.().toISOString?.() ?? "",
    pointsBalance: d.pointsBalance ?? 0,
    lifetimePoints: d.lifetimePoints ?? 0,
    currentTier: d.currentTier ?? "tier1",
    streakCount: d.streakCount ?? 0,
    lastVisitDate:
      typeof d.lastVisitDate === "string" ? d.lastVisitDate : undefined,
    lastActivityAt: d.lastActivityAt?.toDate?.().toISOString?.() ?? "",
  };
}

export type LoyaltyWallet = {
  customer: Customer;
  program: ProgramSettings;
  tierLabel: string;
};

export async function getCustomerWalletByPhone(
  orgId: string,
  phone: string,
): Promise<LoyaltyWallet | null> {
  const [program, customer] = await Promise.all([
    getOrgProgramSettings(orgId),
    getCustomerByPhone(orgId, phone),
  ]);

  if (!customer) return null;

  const tierLabel = getTierLabel(customer.currentTier, program);

  return {
    customer,
    program,
    tierLabel,
  };
}

/* ------------------------------------------------------------------
 * Core mutations
 * ------------------------------------------------------------------*/

export async function findOrCreateCustomerByPhone(
  orgId: string,
  phone: string,
  name?: string,
): Promise<Customer> {
  const customersRef = collection(getClientDb(), "orgs", orgId, "loyaltyCustomers");
  const q = query(customersRef, where("phone", "==", phone));
  const snap = await getDocs(q);

  if (!snap.empty) {
    const docSnap = snap.docs[0];
    const d = docSnap.data() as any;
    return {
      id: docSnap.id,
      name: d.name ?? phone,
      email: d.email,
      phone: d.phone,
      joinedAt: d.joinedAt?.toDate?.().toISOString?.() ?? "",
      pointsBalance: d.pointsBalance ?? 0,
      lifetimePoints: d.lifetimePoints ?? 0,
      currentTier: d.currentTier ?? "tier1",
      streakCount: d.streakCount ?? 0,
      lastVisitDate:
        typeof d.lastVisitDate === "string" ? d.lastVisitDate : undefined,
      lastActivityAt: d.lastActivityAt?.toDate?.().toISOString?.() ?? "",
    };
  }

  // create new
  const docRef = doc(customersRef);
  const now = serverTimestamp();

  await setDoc(docRef, {
    name: name ?? phone,
    phone,
    joinedAt: now,
    pointsBalance: 0,
    lifetimePoints: 0,
    currentTier: "tier1",
    streakCount: 0,
    lastVisitDate: null,
    lastActivityAt: now,
  });

  const nowIso = new Date().toISOString();

  return {
    id: docRef.id,
    name: name ?? phone,
    phone,
    joinedAt: nowIso,
    pointsBalance: 0,
    lifetimePoints: 0,
    currentTier: "tier1",
    streakCount: 0,
    lastVisitDate: undefined,
    lastActivityAt: nowIso,
  };
}

export async function addPointsForPurchase(options: {
  orgId: string;
  customerId: string;
  staffId?: string;
  purchaseAmount: number;
}) {
  const { orgId, customerId, staffId, purchaseAmount } = options;

  // Load program settings (with safe defaults)
  const programSettings = await getOrgProgramSettings(orgId);

  const earnPoints = Math.round(
    purchaseAmount * (programSettings.pointsPerDollar ?? 1),
  );

  const customerRef = doc(getClientDb(), "orgs", orgId, "loyaltyCustomers", customerId);
  const customerSnap = await getDoc(customerRef);
  if (!customerSnap.exists()) {
    throw new Error("Customer not found when adding points.");
  }
  const c = customerSnap.data() as any;

  const currentPoints = c.pointsBalance ?? 0;
  const lifetimePoints = c.lifetimePoints ?? 0;
  const streakCount = c.streakCount ?? 0;
  const lastVisitDate = c.lastVisitDate ?? undefined;

  const { newStreak, streakBonus } = updateStreak(
    streakCount,
    lastVisitDate,
    programSettings.streakConfig,
  );

  const totalEarned = earnPoints + streakBonus;
  const newLifetime = lifetimePoints + totalEarned;
  const newBalance = currentPoints + totalEarned;
  const newTier = calculateTier(newLifetime, programSettings.tierThresholds);

  // update customer
  await updateDoc(customerRef, {
    pointsBalance: newBalance,
    lifetimePoints: newLifetime,
    currentTier: newTier,
    streakCount: newStreak,
    lastVisitDate: todayISO(),
    lastActivityAt: serverTimestamp(),
  });

  // log transaction (loyalty-specific)
  await addDoc(collection(getClientDb(), "orgs", orgId, "loyaltyTransactions"), {
    customerId,
    type: "earn",
    points: totalEarned,
    purchaseAmount,
    staffId: staffId ?? null,
    note: streakBonus > 0 ? "Includes streak bonus" : null,
    createdAt: serverTimestamp(),
  });

  return {
    newBalance,
    newLifetime,
    newTier,
    newStreak,
    streakBonus,
    earnedBase: earnPoints,
  };
}

export async function redeemRewardForCustomer(params: {
  orgId: string;
  customerId: string;
  rewardId: string;
  staffId?: string;
}) {
  const { orgId, customerId, rewardId, staffId } = params;

  // References to customer + reward docs
  const customerRef = doc(getClientDb(), "orgs", orgId, "loyaltyCustomers", customerId);
  const rewardRef = doc(getClientDb(), "orgs", orgId, "loyaltyRewards", rewardId); // 🔹 matches admin/staff collection

  // Load both docs in parallel
  const [customerSnap, rewardSnap] = await Promise.all([
    getDoc(customerRef),
    getDoc(rewardRef),
  ]);

  if (!customerSnap.exists()) {
    throw new Error("Customer not found.");
  }

  if (!rewardSnap.exists()) {
    throw new Error("Reward not found.");
  }

  const customerData = customerSnap.data() as any;
  const rewardData = rewardSnap.data() as any;

  const currentBalance: number = customerData.pointsBalance ?? 0;
  const cost: number =
    typeof rewardData.pointsCost === "number" ? rewardData.pointsCost : 0;

  if (cost <= 0) {
    throw new Error("Reward has no points cost configured.");
  }

  if (currentBalance < cost) {
    throw new Error("Customer does not have enough points for this reward.");
  }

  const newBalance = currentBalance - cost;

  // Update customer balance
  await updateDoc(customerRef, {
    pointsBalance: newBalance,
    lastActivityAt: serverTimestamp(),
    lastRedeemedAt: serverTimestamp(),
    lastRewardId: rewardId,
  });

  // Log redemption in loyaltyTransactions
  await addDoc(collection(getClientDb(), "orgs", orgId, "loyaltyTransactions"), {
    customerId,
    rewardId,
    type: "redeem",
    points: -cost, // negative since points are deducted
    staffId: staffId ?? null,
    createdAt: serverTimestamp(),
  });

  return { newBalance };
}