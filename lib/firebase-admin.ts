import "server-only";

import {
  getApps,
  initializeApp,
  applicationDefault,
  cert,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  getFirestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

type ServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function initAdmin(): App {
  const existingApp = getApps()[0];

  if (existingApp) {
    return existingApp;
  }

  // Prevent accidental use on Edge.
  if (process.env.NEXT_RUNTIME === "edge") {
    throw new Error(
      "Firebase Admin cannot run on the Edge runtime. " +
        "Move this code to a Node.js route or add `export const runtime = 'nodejs'`.",
    );
  }

  const b64 = process.env.FIREBASE_ADMIN_CREDENTIALS_BASE64 || "";
  const raw = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON || "";
  const hasADCFile = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);

  if (b64 || raw) {
    let jsonStr: string;

    try {
      jsonStr = raw
        ? raw.trim()
        : Buffer.from(b64.trim(), "base64").toString("utf8");
    } catch {
      throw new Error(
        "Failed to decode FIREBASE_ADMIN_CREDENTIALS_BASE64. Ensure it is the base64 of the FULL service account JSON.",
      );
    }

    let creds: ServiceAccount;

    try {
      creds = JSON.parse(jsonStr) as ServiceAccount;
    } catch {
      throw new Error(
        "Admin creds JSON.parse failed. Ensure the env contains the FULL service account JSON, not just the private key.",
      );
    }

    if (!creds.project_id || !creds.client_email || !creds.private_key) {
      throw new Error(
        "Admin creds missing required fields: project_id, client_email, private_key.",
      );
    }

    // Normalize newline issues from envs such as Vercel, Windows, and shell escaping.
    const normalizedKey = creds.private_key
      .replace(/\r\n/g, "\n")
      .replace(/\\n/g, "\n");

    return initializeApp({
      credential: cert({
        projectId: creds.project_id,
        clientEmail: creds.client_email,
        privateKey: normalizedKey,
      }),
      projectId: creds.project_id,
    });
  }

  if (hasADCFile) {
    const projectId =
      process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

    return initializeApp({
      credential: applicationDefault(),
      ...(projectId ? { projectId } : {}),
    });
  }

  throw new Error(
    "Admin SDK creds not found. Set FIREBASE_ADMIN_CREDENTIALS_BASE64 (preferred) or " +
      "FIREBASE_ADMIN_CREDENTIALS_JSON, or provide GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON file.",
  );
}

export const adminApp = initAdmin();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

try {
  // settings exists on admin Firestore for most versions.
  adminDb.settings?.({ ignoreUndefinedProperties: true });
} catch {
  // Safe no-op across versions.
}

export { FieldValue, Timestamp };
export const adminFieldValue = FieldValue;