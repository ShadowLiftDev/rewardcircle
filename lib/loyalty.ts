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
import type { Customer, ProgramSettings } from "./types";

function todayISO() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Decide which tier id a customer belongs to given their lifetime points
 * and a map of tier thresholds (e.g. { starter: 250, intermediate: 1000, ... }).
 */
function calculateTier(
  lifetimePoints: number,
  thresholds: ProgramSettings["tierThresholds"],
): string {
  const entries = Object.entries(thresholds)
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
    .sort(([, a], [, b]) => a - b); // ascending by requiredPoints

  if (!entries.length) {
    return "tier1"; // fallback id if somehow misconfigured
  }

  // Start at the lowest tier and move up while lifetimePoints >= threshold
  let currentId = entries[0][0];

  for (const [id, min] of entries) {
    if (lifetimePoints >= min) {
      currentId = id;
    } else {
      break;
    }
  }

  return currentId;
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
  // Align this with your Firestore loyaltyPrograms/default doc
  return {
    pointsPerDollar: 2,
    tierThresholds: {
      starter: 250,
      intermediate: 1000,
      expert: 2500,
      vip: 5000,
    },
    tierNames: {
      starter: "Starter",
      intermediate: "Intermediate",
      expert: "Expert",
      vip: "VIP",
    },
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
  const snap = await getDoc(doc(getClientDb(), "orgs", orgId));
  if (!snap.exists()) {
    return getDefaultProgramSettings();
  }

  const data = snap.data() as any;
  const raw = (data.programSettings || {}) as Partial<ProgramSettings>;

  const base = getDefaultProgramSettings();

  // Normalize tier thresholds into Record<string, number>
  const rawThresholds = (raw.tierThresholds || {}) as Record<string, any>;
  const tierThresholds: Record<string, number> = {};

  for (const [id, v] of Object.entries(rawThresholds)) {
    const n = Number(v);
    if (Number.isFinite(n)) {
      tierThresholds[id] = n;
    }
  }

  const rawNames = (raw.tierNames || {}) as Record<string, any>;
  const tierNames: Record<string, string> = {};

  for (const [id, v] of Object.entries(rawNames)) {
    const name = String(v ?? "").trim();
    if (name) {
      tierNames[id] = name;
    }
  }

const sc = (raw.streakConfig ??
  {}) as Partial<ProgramSettings["streakConfig"]>;

return {
  pointsPerDollar:
    typeof raw.pointsPerDollar === "number"
      ? raw.pointsPerDollar
      : base.pointsPerDollar,

  tierThresholds:
    Object.keys(tierThresholds).length > 0
      ? tierThresholds
      : base.tierThresholds,

  tierNames:
    Object.keys(tierNames).length > 0 ? tierNames : base.tierNames,

  streakConfig: {
    enabled:
      typeof sc.enabled === "boolean"
        ? sc.enabled
        : base.streakConfig.enabled,
    windowDays:
      typeof sc.windowDays === "number"
        ? sc.windowDays
        : base.streakConfig.windowDays,
    bonusPoints:
      typeof sc.bonusPoints === "number"
        ? sc.bonusPoints
        : base.streakConfig.bonusPoints,
    minVisitsForBonus:
      typeof sc.minVisitsForBonus === "number"
        ? sc.minVisitsForBonus
        : base.streakConfig.minVisitsForBonus,
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

  // Fallbacks for old style "tier1/tier2/..." ids
  if (/^tier(\d+)$/i.test(tierKey)) {
    const m = tierKey.match(/^tier(\d+)$/i);
    const num = m?.[1] ?? "1";
    return `Tier ${num}`;
  }

  // Generic fallback: capitalize the id (starter → Starter)
  if (tierKey && typeof tierKey === "string") {
    return tierKey.charAt(0).toUpperCase() + tierKey.slice(1);
  }

  return "Tier 1";
}

// Read-only lookup (no create)
export async function getCustomerByPhone(
  orgId: string,
  phone: string,
): Promise<Customer | null> {
  const customersRef = collection(
    getClientDb(),
    "orgs",
    orgId,
    "loyaltyCustomers",
  );
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
    currentTier: d.currentTier ?? "starter", // or some default id
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
  const customersRef = collection(
    getClientDb(),
    "orgs",
    orgId,
    "loyaltyCustomers",
  );
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
      currentTier: d.currentTier ?? "starter",
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
    currentTier: "starter", // lowest tier id
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
    currentTier: "starter",
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

  const customerRef = doc(
    getClientDb(),
    "orgs",
    orgId,
    "loyaltyCustomers",
    customerId,
  );
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
  const newTier = calculateTier(
    newLifetime,
    programSettings.tierThresholds,
  );

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
  await addDoc(
    collection(getClientDb(), "orgs", orgId, "loyaltyTransactions"),
    {
      customerId,
      type: "earn",
      points: totalEarned,
      purchaseAmount,
      staffId: staffId ?? null,
      note: streakBonus > 0 ? "Includes streak bonus" : null,
      createdAt: serverTimestamp(),
    },
  );

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
  const customerRef = doc(
    getClientDb(),
    "orgs",
    orgId,
    "loyaltyCustomers",
    customerId,
  );
  const rewardRef = doc(
    getClientDb(),
    "orgs",
    orgId,
    "loyaltyRewards",
    rewardId,
  );

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
  await addDoc(
    collection(getClientDb(), "orgs", orgId, "loyaltyTransactions"),
    {
      customerId,
      rewardId,
      type: "redeem",
      points: -cost, // negative since points are deducted
      staffId: staffId ?? null,
      createdAt: serverTimestamp(),
    },
  );

  return { newBalance };
}