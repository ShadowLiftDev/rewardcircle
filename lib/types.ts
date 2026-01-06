// ---- Tier key typing (supports BOTH legacy tier1..tier4 and new dynamic ids) ----

export type LegacyTierKey = "tier1" | "tier2" | "tier3" | "tier4";

/**
 * "tier1" | "tier2" | ... are still allowed,
 * but ANY string id (starter/intermediate/vip) is also allowed.
 */
export type TierKey = LegacyTierKey | (string & {});

/**
 * Allows dynamic threshold keys, while still letting old code do:
 * programSettings.tierThresholds.tier2
 */
export type TierThresholds = Record<string, number> & Partial<Record<LegacyTierKey, number>>;

export type TierNames = Record<string, string> & Partial<Record<LegacyTierKey, string>>;

// ---- Program Settings ----

export interface ProgramSettings {
  pointsPerDollar: number;
  tierThresholds: TierThresholds;
  tierNames?: TierNames;
  streakConfig: {
    enabled: boolean;
    windowDays: number;
    bonusPoints: number;
    minVisitsForBonus: number;
  };
}

// ---- Org ----

export interface Org {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  createdAt: string;
  isActive: boolean;
  programSettings: ProgramSettings;
}

// ---- Customer ----

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  joinedAt: string;
  pointsBalance: number;
  lifetimePoints: number;
  currentTier: TierKey; // ✅ dynamic ("starter", "vip", etc.)
  streakCount: number;
  lastVisitDate?: string;
  lastActivityAt: string;
}

// ---- Staff / Transactions unchanged ----

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: "staff" | "admin";
  active: boolean;
  createdAt: string;
}

export type TransactionType = "earn" | "redeem" | "adjust";

export interface Transaction {
  id: string;
  customerId: string;
  type: TransactionType;
  points: number;
  staffId?: string;
  rewardId?: string;
  purchaseAmount?: number;
  note?: string;
  createdAt: string;
}