"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

const DEFAULT_ORG =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || "neon-lunchbox";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next"); // optional override, but owner-only

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!email.trim() || !password) {
      setErr("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      // Lazy-load all Firebase client code so nothing runs during build/SSR
      const [
        { getClientAuth, getClientDb },
        { signInWithEmailAndPassword, signOut },
        { doc, getDoc },
      ] = await Promise.all([
        import("@/lib/firebase-client"),
        import("firebase/auth"),
        import("firebase/firestore"),
      ]);

      // Firebase login
      const auth = getClientAuth();
      const userCred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const uid = userCred.user.uid;

      // Fetch role from Firestore
      const db = getClientDb();
      const roleSnap = await getDoc(
        doc(db, "orgs", DEFAULT_ORG, "roles", uid),
      );

      if (!roleSnap.exists()) {
        await signOut(auth);
        throw new Error("Access denied. No role assigned for this account.");
      }

      const role = roleSnap.data().role as "owner" | "staff" | "customer";

      // OWNER-ONLY GATE
      if (role !== "owner") {
        await signOut(auth);
        throw new Error(
          "Access denied. This sign-in is for owners only.",
        );
      }

      // Optional next override, but only for valid owners
      if (next) {
        router.push(next);
        return;
      }

      // Default owner dashboard
      router.push(`/orgs/${DEFAULT_ORG}/loyalty/admin`);
    } catch (error: any) {
      console.error("[login] sign in error:", error);
      setErr(error?.message || "Sign in failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-50">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/80 p-6 shadow-[0_0_60px_rgba(56,189,248,0.25)]">
        <div className="mb-5 space-y-1 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-[radial-gradient(circle_at_30%_30%,#22d3ee,transparent_55%),radial-gradient(circle_at_70%_70%,#6366f1,transparent_55%)]" />
          <h1 className="text-xl font-semibold">Owner Sign-In</h1>
          <p className="text-xs text-slate-400">
            Sign in to manage RewardCircle settings and reports.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* email */}
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="text-xs font-medium text-slate-300"
            >
              Owner Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              placeholder="owner@business.com"
            />
          </div>

          {/* password */}
          <div className="space-y-1">
            <label
              htmlFor="password"
              className="text-xs font-medium text-slate-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              placeholder="••••••••"
            />
          </div>

          {err && <p className="text-xs text-red-300">{err}</p>}

          {/* submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Signing in…" : "Sign in as Owner"}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          This portal is for owners only. Staff and customers access
          RewardCircle at the venue.
        </p>
      </div>
    </main>
  );
}