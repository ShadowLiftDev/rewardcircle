export interface ProgramSettings {
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
}

export interface Org {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  createdAt: string;
  isActive: boolean;
  programSettings: ProgramSettings;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  joinedAt: string;
  pointsBalance: number;
  lifetimePoints: number;
  currentTier: "tier1" | "tier2" | "tier3" | "tier4";
  streakCount: number;
  lastVisitDate?: string;
  lastActivityAt: string;
}

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