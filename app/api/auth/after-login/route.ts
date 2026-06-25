import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireUser, type OrgRole } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AfterLoginBody = {
  allowedRoles?: OrgRole[];
  moduleId?: string;
  preferredDestination?: string;
  next?: string | null;
};

type OrgAccess = {
  orgId: string;
  role: OrgRole;
  name?: string;
  status?: string;
};

const DEFAULT_ALLOWED_ROLES: OrgRole[] = ["owner", "admin"];

const ADMIN_SESSION_COOKIE = "admin_session";
const ADMIN_SESSION_EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function readBearerToken(req: NextRequest): string | null {
  const raw = req.headers.get("authorization") || "";
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

async function withAdminSessionCookie(
  req: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const token = readBearerToken(req);

  if (!token) {
    return response;
  }

  const sessionCookie = await adminAuth.createSessionCookie(token, {
    expiresIn: ADMIN_SESSION_EXPIRES_IN_MS,
  });

  response.cookies.set(ADMIN_SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_EXPIRES_IN_MS / 1000,
  });

  return response;
}

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function cleanString(value: unknown, max = 300): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function normalizeRole(value: unknown): OrgRole | null {
  const role = String(value || "").toLowerCase();

  if (
    role === "owner" ||
    role === "admin" ||
    role === "staff" ||
    role === "customer"
  ) {
    return role;
  }

  return null;
}

function normalizeAllowedRoles(value: unknown): OrgRole[] {
  if (!Array.isArray(value)) return DEFAULT_ALLOWED_ROLES;

  const roles = value
    .map(normalizeRole)
    .filter((role): role is OrgRole => Boolean(role));

  return roles.length > 0 ? roles : DEFAULT_ALLOWED_ROLES;
}

function isActiveStatus(value: unknown) {
  const status = String(value || "active").toLowerCase();
  return status === "active";
}

function isSafeInternalPath(value: string | null) {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.includes("://")) return false;

  return true;
}

function rewardCircleAdminPath(orgId: string) {
  return `/orgs/${orgId}/growth/reward-circle`;
}

async function findUserOrgRoles({
  uid,
  allowedRoles,
}: {
  uid: string;
  allowedRoles: OrgRole[];
}): Promise<OrgAccess[]> {
  const access: OrgAccess[] = [];

  const orgsSnap = await adminDb.collection("orgs").limit(100).get();

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;

    const roleSnap = await adminDb
      .doc(`orgs/${orgId}/roles/${uid}`)
      .get()
      .catch(() => null);

    if (!roleSnap || !roleSnap.exists) continue;

    const roleData = roleSnap.data() || {};
    const role = normalizeRole(roleData.role);
    const status = cleanString(roleData.status, 40) || "active";

    if (!role || !allowedRoles.includes(role)) continue;
    if (!isActiveStatus(status)) continue;

    const orgData = orgDoc.data() || {};

    const name =
      cleanString(orgData.name, 120) ||
      cleanString(orgData.displayName, 120) ||
      cleanString(orgData.title, 120) ||
      undefined;

    access.push({
      orgId,
      role,
      status,
      name,
    });
  }

  return access.sort((a, b) => a.orgId.localeCompare(b.orgId));
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const body = (await req.json().catch(() => ({}))) as AfterLoginBody;

    const allowedRoles = normalizeAllowedRoles(body.allowedRoles);

    /**
     * RewardCircle standalone admin engine should only accept owner/admin.
     * Even if the client accidentally sends staff/customer, strip them out.
     */
    const rewardCircleAllowedRoles = allowedRoles.filter(
      (role) => role === "owner" || role === "admin",
    );

    const finalAllowedRoles =
      rewardCircleAllowedRoles.length > 0
        ? rewardCircleAllowedRoles
        : DEFAULT_ALLOWED_ROLES;

    const moduleId = cleanString(body.moduleId, 80) || "rewardcircle";
    const preferredDestination =
      cleanString(body.preferredDestination, 120) || "rewardcircle_admin";
    const next = cleanString(body.next, 300);

    const orgs = await findUserOrgRoles({
      uid: user.uid,
      allowedRoles: finalAllowedRoles,
    });

    if (orgs.length === 0) {
      return jsonNoStore(
        {
          ok: false,
          reason: "NO_REWARDCIRCLE_ADMIN_ACCESS",
          error:
            "No RewardCircle admin access was found for this account. Owner or admin access is required.",
        },
        403,
      );
    }

    if (orgs.length === 1) {
      const org = orgs[0];

      const redirectTo = isSafeInternalPath(next)
        ? next
        : preferredDestination === "rewardcircle_admin" ||
            moduleId === "rewardcircle"
          ? rewardCircleAdminPath(org.orgId)
          : `/orgs/${org.orgId}`;

      const response = jsonNoStore({
        ok: true,
        orgId: org.orgId,
        role: org.role,
        redirectTo,
        orgs,
        meta: {
          uid: user.uid,
          moduleId,
          preferredDestination,
          allowedRoles: finalAllowedRoles,
        },
      });

      return withAdminSessionCookie(req, response);
    }

    const response = jsonNoStore({
      ok: true,
      orgs,
      redirectTo: "/orgs/select?module=reward-circle",
      meta: {
        uid: user.uid,
        moduleId,
        preferredDestination,
        allowedRoles: finalAllowedRoles,
        requiresOrgSelection: true,
      },
    });

    return withAdminSessionCookie(req, response);
  } catch (error) {
    console.error("[api/auth/after-login][POST]", error);

    const message =
      error instanceof Error ? error.message : "Failed to resolve access.";

    const isAuthError =
      message.includes("Missing or invalid authorization") ||
      message.includes("invalid authorization") ||
      message.includes("auth");

    return jsonNoStore(
      {
        ok: false,
        reason: isAuthError ? "UNAUTHENTICATED" : "SERVER_ERROR",
        error: isAuthError
          ? "You must be signed in before RewardCircle admin access can be resolved."
          : "Failed to resolve RewardCircle admin access.",
      },
      isAuthError ? 401 : 500,
    );
  }
}