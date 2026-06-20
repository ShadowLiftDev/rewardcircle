import { getClientAuth } from "@/lib/firebase-client";

import type {
  RewardCircleActivity,
  RewardCircleAdminCustomerSummary,
  RewardCircleOverviewSummary,
} from "./types";

import type {
  RewardCircleAdminRewardSummary,
  RewardCircleSettingsPayload,
} from "./admin-server";

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

async function getAuthHeaders(
  includeJsonContentType = false,
): Promise<HeadersInit> {
  const auth = getClientAuth();
  const user = auth.currentUser;

  const headers: HeadersInit = {};

  if (includeJsonContentType) {
    headers["content-type"] = "application/json";
  }

  if (user) {
    const token = await user.getIdToken();
    headers["authorization"] = `Bearer ${token}`;
  }

  return headers;
}

async function readJsonOrThrow<T>(
  res: Response,
  fallbackMessage: string,
): Promise<T> {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || `${fallbackMessage} (${res.status}).`);
  }

  return data as T;
}

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------

export async function getRewardCircleSettings(
  orgId: string,
): Promise<RewardCircleSettingsPayload> {
  const headers = await getAuthHeaders();

  const res = await fetch(
    `/api/orgs/${orgId}/growth/reward-circle/settings`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
  );

  return readJsonOrThrow<RewardCircleSettingsPayload>(
    res,
    "Failed to load RewardCircle settings",
  );
}

export async function fetchRewardCircleSettingsForOrg(
  orgId: string,
): Promise<RewardCircleSettingsPayload> {
  return getRewardCircleSettings(orgId);
}

export async function saveRewardCircleSettingsForOrg(
  orgId: string,
  payload: RewardCircleSettingsPayload,
): Promise<RewardCircleSettingsPayload> {
  const headers = await getAuthHeaders(true);

  const res = await fetch(
    `/api/orgs/${orgId}/growth/reward-circle/settings`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  const data = await readJsonOrThrow<{
    ok: boolean;
    settings?: RewardCircleSettingsPayload;
  }>(res, "Failed to save RewardCircle settings");

  return data.settings || payload;
}

// -----------------------------------------------------------------------------
// Overview
// -----------------------------------------------------------------------------

export async function getRewardCircleOverviewSummary(
  orgId: string,
): Promise<RewardCircleOverviewSummary> {
  const headers = await getAuthHeaders();

  const res = await fetch(
    `/api/orgs/${orgId}/growth/reward-circle/overview`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
  );

  const data = await readJsonOrThrow<{
    summary: RewardCircleOverviewSummary;
  }>(res, "Failed to load RewardCircle overview");

  return data.summary;
}

// -----------------------------------------------------------------------------
// Admin customers / members
// -----------------------------------------------------------------------------

export async function getRewardCircleAdminCustomers(
  orgId: string,
): Promise<RewardCircleAdminCustomerSummary[]> {
  const headers = await getAuthHeaders();

  const res = await fetch(
    `/api/orgs/${orgId}/growth/reward-circle/customers`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
  );

  const data = await readJsonOrThrow<{
    customers: RewardCircleAdminCustomerSummary[];
  }>(res, "Failed to load RewardCircle customers");

  return data.customers;
}

export async function getRewardCircleAdminMemberById(
  orgId: string,
  memberId: string,
): Promise<{
  customer: RewardCircleAdminCustomerSummary;
  activity: RewardCircleActivity[];
  transactions: RewardCircleActivity[];
}> {
  const headers = await getAuthHeaders();

  const res = await fetch(
    `/api/orgs/${orgId}/growth/reward-circle/customers/${memberId}`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
  );

  return readJsonOrThrow<{
    customer: RewardCircleAdminCustomerSummary;
    activity: RewardCircleActivity[];
    transactions: RewardCircleActivity[];
  }>(res, "Failed to load RewardCircle customer");
}

// -----------------------------------------------------------------------------
// Rewards
// -----------------------------------------------------------------------------

export async function getRewardCircleAdminRewards(
  orgId: string,
): Promise<RewardCircleAdminRewardSummary[]> {
  const headers = await getAuthHeaders();

  const res = await fetch(
    `/api/orgs/${orgId}/growth/reward-circle/rewards`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
  );

  const data = await readJsonOrThrow<{
    rewards: RewardCircleAdminRewardSummary[];
  }>(res, "Failed to load RewardCircle rewards");

  return data.rewards;
}

// -----------------------------------------------------------------------------
// Activity
// -----------------------------------------------------------------------------

export async function getRecentRewardCircleActivity(
  orgId: string,
): Promise<RewardCircleActivity[]> {
  const headers = await getAuthHeaders();

  const res = await fetch(
    `/api/orgs/${orgId}/growth/reward-circle/activity`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
  );

  const data = await readJsonOrThrow<{
    activity: RewardCircleActivity[];
    transactions?: RewardCircleActivity[];
  }>(res, "Failed to load RewardCircle activity");

  return data.activity;
}