import { headers as nextHeaders, cookies as nextCookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";

const DEV_KEY = process.env.DEV_TEST_KEY || "";

/** Minimal headers interface so we never fight union types */
type SimpleHeaders = { get(name: string): string | null };

/** Parse a Cookie header string into a tiny map */
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

/** Get unified header/cookie readers from either a provided Request or Next runtime */
async function getHeaderCookieViews(req?: Request): Promise<{
  h: SimpleHeaders;
  readCookie: (name: string) => string;
}> {
  if (req) {
    const map = parseCookieHeader(req.headers.get("cookie"));
    return {
      h: { get: (n) => req.headers.get(n) },
      readCookie: (name) => map[name] ?? "",
    };
  }

  // Next 16: may be async; await to avoid Promise unions
  const hRaw = await nextHeaders();
  const cRaw = await nextCookies();

  return {
    h: { get: (n) => hRaw.get(n) },
    readCookie: (name) => cRaw.get(name)?.value ?? "",
  };
}

export async function requireUser(req?: Request) {
  const { h, readCookie } = await getHeaderCookieViews(req);

  // 🧪 DEV SESSION via devpass + cookies (preferred in RewardCircle)
  {
    const devPass = readCookie("devpass");
    const devOn = readCookie("dev_testmode") === "on";
    const devKey = readCookie("dev_key");
    const devRole = (readCookie("dev_role") || "owner").toLowerCase();

    if (devPass === "ok" && devOn && DEV_KEY && devKey === DEV_KEY) {
      return { uid: `__dev__:${devRole}` } as any;
    }
  }

  // 🔵 DEV OVERRIDE (headers) — dev wins first for tools/Postman etc.
  {
    const devKeyHdr = h.get("x-dev-key");
    const devRoleHdr = (h.get("x-dev-role") || "").toLowerCase();
    if (DEV_KEY && devKeyHdr && devKeyHdr === DEV_KEY) {
      return { uid: `__dev__:${devRoleHdr || "owner"}` } as any;
    }
  }

  // 🟣 DEV OVERRIDE (cookies, legacy Referralink behavior)
  {
    const devOn = readCookie("dev_testmode") === "on";
    const devKey = readCookie("dev_key");
    const devRole = (readCookie("dev_role") || "owner").toLowerCase();

    if (devOn && DEV_KEY && devKey === DEV_KEY) {
      return { uid: `__dev__:${devRole}` } as any;
    }
  }

  // 🟢 Normal Firebase ID token path
  {
    const raw = h.get("authorization") || "";
    const m = raw.match(/^Bearer\s+(.+)$/i);
    const token = m?.[1];
    if (token) {
      const decoded = await getAuth().verifyIdToken(token);
      return decoded; // { uid, email, ... }
    }
  }

  throw new Error("Missing or invalid authorization.");
}

export async function requireRole(
  orgId: string,
  uid: string,
  allowed: Array<"owner" | "staff" | "customer">,
  req?: Request,
): Promise<"owner" | "staff" | "customer"> {
  const { h, readCookie } = await getHeaderCookieViews(req);

  // 🧪 DEV SESSION via devpass (RewardCircle)
  {
    const devPass = readCookie("devpass");
    const devOn = readCookie("dev_testmode") === "on";
    const devRoleCookie = (readCookie("dev_role") || "owner").toLowerCase() as
      | "owner"
      | "staff"
      | "customer";

    if (devPass === "ok" && devOn && allowed.includes(devRoleCookie)) {
      return devRoleCookie;
    }
  }

  // Dev-injected user? (Referralink behavior)
  if (uid.startsWith("__dev__")) {
    const roleFromUid = (uid.split(":")[1] || "owner") as
      | "owner"
      | "staff"
      | "customer";

    // Also honor explicit dev role in headers/cookies when provided
    const hdrRole = (h.get("x-dev-role") || "").toLowerCase() as
      | "owner"
      | "staff"
      | "customer"
      | "";
    const cookieRole = readCookie("dev_role") || "";

    const effective = (hdrRole || cookieRole || roleFromUid) as
      | "owner"
      | "staff"
      | "customer";
    if (allowed.includes(effective)) return effective;
    throw new Error("Forbidden");
  }

  // Normal Firestore role lookup
  const snap = await adminDb.doc(`orgs/${orgId}/roles/${uid}`).get();
  const role = (snap.exists ? (snap.data()?.role as any) : null) as
    | "owner"
    | "staff"
    | "customer"
    | null;

  if (!role || !allowed.includes(role)) throw new Error("Forbidden");
  return role;
}