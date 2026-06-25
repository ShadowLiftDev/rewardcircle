"use client";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getClientAuth, getIdToken } from "@/lib/firebase-client";

type AllowedRole = "owner" | "admin";

type AfterLoginResponse = {
  redirectTo?: string;
  error?: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isAllowedRole(value: unknown): value is AllowedRole {
  return value === "owner" || value === "admin";
}

function normalizeAllowedRoles(roles?: AllowedRole[]): AllowedRole[] {
  const fallback: AllowedRole[] = ["owner", "admin"];

  if (!Array.isArray(roles) || roles.length === 0) return fallback;

  const cleaned = roles.filter(isAllowedRole);
  return cleaned.length ? cleaned : fallback;
}

async function readJsonSafe(res: Response): Promise<AfterLoginResponse> {
  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await res.text().catch(() => "");
    return text ? { error: text } : {};
  }

  return res.json().catch(() => ({}));
}

export async function signInClient(args: {
  email: string;
  password: string;
  allowedRoles?: AllowedRole[];
}): Promise<{ redirectTo: string }> {
  const auth = getClientAuth();

  const email = normalizeEmail(args.email);
  const password = args.password;
  const allowedRoles = normalizeAllowedRoles(args.allowedRoles);

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  await signInWithEmailAndPassword(auth, email, password);

  const token = await getIdToken();

  if (!token) {
    await signOut(auth).catch(() => undefined);
    throw new Error("Unable to verify sign-in session.");
  }

  const res = await fetch("/api/auth/after-login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      allowedRoles,
      moduleId: "rewardcircle",
      preferredDestination: "rewardcircle_admin",
    }),
    cache: "no-store",
  });

  const json = await readJsonSafe(res);

  if (!res.ok) {
    await signOut(auth).catch(() => undefined);
    throw new Error(json.error || "Sign-in failed.");
  }

  if (!json.redirectTo || typeof json.redirectTo !== "string") {
    await signOut(auth).catch(() => undefined);
    throw new Error("Sign-in succeeded, but no destination was returned.");
  }

  return { redirectTo: json.redirectTo };
}