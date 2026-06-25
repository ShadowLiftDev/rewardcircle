import { headers as nextHeaders, cookies as nextCookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const DEV_KEY = process.env.DEV_TEST_KEY || "";

export type OrgRole = "owner" | "staff" | "admin" | "customer";

export type AuthenticatedUser = {
  uid: string;
  email?: string;
  name?: string;
  isDev?: boolean;
  devRole?: OrgRole;
};

/** Minimal headers interface so we never fight union types. */
type SimpleHeaders = { get(name: string): string | null };

type HeaderCookieViews = {
  h: SimpleHeaders;
  readCookie: (name: string) => string;
};

/** Parse a Cookie header string into a tiny map. */
function parseCookieHeader(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};

  if (!header) return out;

  for (const part of header.split(";")) {
    const [k, ...rest] = part.split("=");
    const key = k?.trim();

    if (!key) continue;

    out[key] = decodeURIComponent(rest.join("=").trim() || "");
  }

  return out;
}

function normalizeOrgRole(value: unknown): OrgRole | null {
  const role = String(value || "").toLowerCase();

  if (role === "owner" || role === "staff" || role === "admin" || role === "customer") {
    return role;
  }

  return null;
}

function normalizeDevOrgRole(value: unknown): OrgRole {
  return normalizeOrgRole(value) || "owner";
}

/** Get unified header/cookie readers from either a provided Request or Next runtime. */
async function getHeaderCookieViews(req?: Request): Promise<HeaderCookieViews> {
  if (req) {
    const map = parseCookieHeader(req.headers.get("cookie"));

    return {
      h: { get: (n) => req.headers.get(n) },
      readCookie: (name) => map[name] ?? "",
    };
  }

  // Next 16: may be async; await to avoid Promise unions.
  const hRaw = await nextHeaders();
  const cRaw = await nextCookies();

  return {
    h: { get: (n) => hRaw.get(n) },
    readCookie: (name) => cRaw.get(name)?.value ?? "",
  };
}

function readDevUser(view: HeaderCookieViews): AuthenticatedUser | null {
  if (!DEV_KEY) return null;

  const { h, readCookie } = view;

  // Preferred RewardCircle/dev session cookie path.
  {
    const devPass = readCookie("devpass");
    const devOn = readCookie("dev_testmode") === "on";
    const devKey = readCookie("dev_key");
    const devRole = normalizeDevOrgRole(readCookie("dev_role"));

    if (devPass === "ok" && devOn && devKey === DEV_KEY) {
      return {
        uid: `__dev__:${devRole}`,
        isDev: true,
        devRole,
      };
    }
  }

  // Header override for tools/Postman.
  {
    const devKeyHdr = h.get("x-dev-key");
    const devRoleHdr = normalizeDevOrgRole(h.get("x-dev-role"));

    if (devKeyHdr && devKeyHdr === DEV_KEY) {
      return {
        uid: `__dev__:${devRoleHdr}`,
        isDev: true,
        devRole: devRoleHdr,
      };
    }
  }

  // Legacy cookie dev path.
  {
    const devOn = readCookie("dev_testmode") === "on";
    const devKey = readCookie("dev_key");
    const devRole = normalizeDevOrgRole(readCookie("dev_role"));

    if (devOn && devKey === DEV_KEY) {
      return {
        uid: `__dev__:${devRole}`,
        isDev: true,
        devRole,
      };
    }
  }

  return null;
}

function readDevRole(
  uid: string,
  view: HeaderCookieViews,
): OrgRole | null {
  if (!uid.startsWith("__dev__")) return null;

  const { h, readCookie } = view;

  const roleFromUid = normalizeDevOrgRole(uid.split(":")[1]);
  const roleFromHeader = normalizeOrgRole(h.get("x-dev-role"));
  const roleFromCookie = normalizeOrgRole(readCookie("dev_role"));

  return roleFromHeader || roleFromCookie || roleFromUid;
}

export async function requireUser(req?: Request): Promise<AuthenticatedUser> {
  const view = await getHeaderCookieViews(req);

  const devUser = readDevUser(view);
  if (devUser) return devUser;

  const raw = view.h.get("authorization") || "";
  const match = raw.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];

  if (token) {
    const decoded = await adminAuth.verifyIdToken(token);

    return {
      uid: decoded.uid,
      email: decoded.email,
      name:
        typeof decoded.name === "string"
          ? decoded.name
          : typeof decoded.firebase?.sign_in_provider === "string"
            ? decoded.firebase.sign_in_provider
            : undefined,
      isDev: false,
    };
  }

  const sessionCookie = view.readCookie("admin_session");

  if (sessionCookie) {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    return {
      uid: decoded.uid,
      email: decoded.email,
      name:
        typeof decoded.name === "string"
          ? decoded.name
          : typeof decoded.firebase?.sign_in_provider === "string"
            ? decoded.firebase.sign_in_provider
            : undefined,
      isDev: false,
    };
  }

  throw new Error("Missing or invalid authorization.");
}

export async function requireRole(
  orgId: string,
  uid: string,
  allowed: OrgRole[],
  req?: Request,
): Promise<OrgRole> {
  const view = await getHeaderCookieViews(req);

  const devRole = readDevRole(uid, view);

  if (devRole) {
    if (allowed.includes(devRole)) return devRole;
    throw new Error("Forbidden");
  }

  const snap = await adminDb.doc(`orgs/${orgId}/roles/${uid}`).get();

  const role = snap.exists ? normalizeOrgRole(snap.data()?.role) : null;

  if (!role || !allowed.includes(role)) {
    throw new Error("Forbidden");
  }

  return role;
}