"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInClient } from "@/lib/auth/signInClient";

const ALLOWED_ROLES = ["owner", "admin"] as const;

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextParam = searchParams.get("next")?.trim() || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultRedirectLabel = useMemo(() => {
    if (nextParam) return "Continue to requested admin page";
    return "Continue to RewardCircle Admin";
  }, [nextParam]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Enter your email address.");
      return;
    }

    if (!password) {
      setError("Enter your password.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await signInClient({
        email: cleanEmail,
        password,
        allowedRoles: [...ALLOWED_ROLES],
      });

      router.replace(result.redirectTo);
      router.refresh();
      return;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in to RewardCircle.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-50">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.22),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.18),transparent_34%),radial-gradient(circle_at_50%_90%,rgba(16,185,129,0.14),transparent_38%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.85)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.85)_1px,transparent_1px)] [background-size:56px_56px]"
      />

      <section className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-5 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
        >
          RewardCircle
        </Link>

        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 shadow-[0_0_60px_rgba(34,211,238,0.18)] backdrop-blur-xl">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />

          <div className="p-6 sm:p-8">
            <div className="mx-auto mb-6 h-14 w-14 rounded-full bg-[radial-gradient(circle_at_30%_30%,#22d3ee,transparent_55%),radial-gradient(circle_at_70%_70%,#a855f7,transparent_58%),radial-gradient(circle_at_50%_90%,#34d399,transparent_55%)] shadow-[0_0_35px_rgba(34,211,238,0.25)]" />

            <p className="text-center text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200">
              Admin Engine
            </p>

            <h1 className="mt-3 text-center text-4xl font-black uppercase leading-none tracking-[-0.06em] text-white">
              RewardCircle
              <span className="block bg-gradient-to-r from-cyan-200 via-emerald-200 to-fuchsia-200 bg-clip-text text-transparent">
                Login
              </span>
            </h1>

            <p className="mt-4 text-center text-sm leading-6 text-slate-400">
              Sign in to manage rewards, members, points, tiers, redemptions,
              and the earned-value engine for your organization.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="owner@example.com"
                  className="w-full rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-emerald-300 to-fuchsia-300 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-950 shadow-[0_0_40px_rgba(34,211,238,0.18)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing In..." : defaultRedirectLabel}
              </button>
            </form>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Access Rule
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                RewardCircle admin access is limited to organization owners and
                admins. Customer wallet access does not use this login.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}