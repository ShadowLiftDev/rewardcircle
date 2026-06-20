import { headers } from "next/headers";
import RewardCircleDashboardClient, {
  type RewardCircleDashboardPageData,
} from "./RewardCircleDashboardClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params:
    | {
        orgId?: string;
      }
    | Promise<{
        orgId?: string;
      }>;
};

function getBaseUrl(requestHeaders: Headers) {
  const host =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");

  if (!host) {
    return "http://localhost:3000";
  }

  const protocol = requestHeaders.get("x-forwarded-proto") || "http";

  return `${protocol}://${host}`;
}

function buildFallbackDashboardData(
  orgId: string,
): RewardCircleDashboardPageData {
  const base = `/orgs/${orgId}/growth/reward-circle`;

  return {
    orgId,
    heroSummary:
      "Track earned value, member wallets, reward redemptions, and the health of your customer retention loop.",

    topStats: [
      {
        label: "Members",
        value: "0",
        hint: "RewardCircle wallets currently linked to this organization.",
        tone: "cyan",
      },
      {
        label: "Points Issued",
        value: "0",
        hint: "Total value issued through check-ins, purchases, and rewards.",
        tone: "emerald",
      },
      {
        label: "Points Redeemed",
        value: "0",
        hint: "Points customers have converted back into real rewards.",
        tone: "violet",
      },
      {
        label: "Active Rewards",
        value: "0",
        hint: "Rewards currently available in the public RewardCircle shop.",
        tone: "silver",
      },
    ],

    commandCards: [
      {
        id: "members",
        title: "Members",
        description:
          "View customer wallets, point balances, tiers, and reward activity.",
        href: `${base}/members`,
        tone: "cyan",
        tags: ["Wallets", "Balances"],
      },
      {
        id: "rewards",
        title: "Rewards",
        description:
          "Create and manage the reward offers customers can redeem with points.",
        href: `${base}/rewards`,
        tone: "emerald",
        tags: ["Shop", "Offers"],
      },
      {
        id: "activity",
        title: "Activity",
        description:
          "Review point earnings, redemptions, check-ins, and reward movement.",
        href: `${base}/activity`,
        tone: "violet",
        tags: ["History", "Loop"],
      },
      {
        id: "settings",
        title: "Settings",
        description:
          "Control program rules, earning behavior, public copy, and tier structure.",
        href: `${base}/settings`,
        tone: "mixed",
        tags: ["Rules", "Program"],
      },
    ],

    systemCards: [
      {
        id: "loop",
        label: "Retention Loop",
        value: "Ready",
        tone: "strong",
        summary:
          "RewardCircle is structured to turn visits and purchases into earned value.",
      },
      {
        id: "wallets",
        label: "Wallet System",
        value: "Online",
        tone: "rising",
        summary:
          "Member wallet state is ready for points, redemptions, and tier movement.",
      },
      {
        id: "shop",
        label: "Reward Shop",
        value: "Pending Review",
        tone: "watch",
        summary:
          "Check active rewards before launching the public customer experience.",
      },
      {
        id: "activity",
        label: "Activity Feed",
        value: "Listening",
        tone: "soft",
        summary:
          "Recent RewardCircle events will appear here once members start engaging.",
      },
    ],

    recentActivity: [],
    memberPreview: [],
  };
}

function normalizeDashboardData(
  orgId: string,
  payload: unknown,
): RewardCircleDashboardPageData {
  const fallback = buildFallbackDashboardData(orgId);

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const maybePayload = payload as Partial<RewardCircleDashboardPageData> & {
    data?: Partial<RewardCircleDashboardPageData>;
  };

  const source =
    maybePayload.data && typeof maybePayload.data === "object"
      ? maybePayload.data
      : maybePayload;

  return {
    ...fallback,
    ...source,
    orgId,
    topStats: Array.isArray(source.topStats)
      ? source.topStats
      : fallback.topStats,
    commandCards: Array.isArray(source.commandCards)
      ? source.commandCards
      : fallback.commandCards,
    systemCards: Array.isArray(source.systemCards)
      ? source.systemCards
      : fallback.systemCards,
    recentActivity: Array.isArray(source.recentActivity)
      ? source.recentActivity
      : fallback.recentActivity,
    memberPreview: Array.isArray(source.memberPreview)
      ? source.memberPreview
      : fallback.memberPreview,
  };
}

async function loadDashboardData(orgId: string) {
  const requestHeaders = await headers();
  const baseUrl = getBaseUrl(requestHeaders);

  const cookieHeader = requestHeaders.get("cookie") || "";
  const authorizationHeader = requestHeaders.get("authorization") || "";

  const res = await fetch(
    `${baseUrl}/api/orgs/${encodeURIComponent(
      orgId,
    )}/growth/reward-circle/overview`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...(authorizationHeader
          ? { authorization: authorizationHeader }
          : {}),
      },
    },
  );

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : `Failed to load RewardCircle overview. HTTP ${res.status}`;

    return {
      data: buildFallbackDashboardData(orgId),
      error: message,
    };
  }

  return {
    data: normalizeDashboardData(orgId, payload),
    error: null,
  };
}

export default async function RewardCircleGrowthPage({ params }: PageProps) {
  const resolvedParams = await params;
  const orgId = String(resolvedParams?.orgId ?? "").trim();

  if (!orgId) {
    return (
      <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-100">
        Missing org context. Please reload the page from a valid organization
        route.
      </section>
    );
  }

  const { data, error } = await loadDashboardData(orgId);

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-bold">RewardCircle overview fallback loaded.</p>
          <p className="mt-1 text-amber-100/80">{error}</p>
        </div>
      )}

      <RewardCircleDashboardClient data={data} />
    </div>
  );
}