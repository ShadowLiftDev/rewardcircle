"use client";

import { useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LoyaltyPortalPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();

  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!orgId) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <p className="text-sm text-red-300">
            Missing org context. Try reloading the page.
          </p>
        </div>
      </main>
    );
  }

  async function handleCustomerSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const value = contact.trim();
    if (!value) {
      setError("Enter your phone number or email.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ contact: value });
      router.push(`/orgs/${orgId}/loyalty/customer?${params.toString()}`);
    } finally {
      setLoading(false);
    }
  }

  function goToStaffLogin() {
    const redirect = encodeURIComponent(`/orgs/${orgId}/loyalty/staff/earn`);
    router.push(`/login?redirect=${redirect}`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-400/80">
            NeonHQ · RewardCircle
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50">
            Loyalty Portal
          </h1>
          <p className="max-w-2xl text-sm text-slate-300/80">
            Customers can look up their points in seconds. Staff and owners can
            sign in to manage the full RewardCircle console.
          </p>
        </header>

        {/* Two-panel layout */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Customer panel */}
          <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/80 p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-50">
              For Customers
            </h2>
            <p className="mt-1 text-sm text-slate-300/80">
              Check your points, streaks, and rewards using your{" "}
              <span className="font-semibold text-emerald-300">
                phone number or email
              </span>
              . No app download or password required.
            </p>

            <form
              onSubmit={handleCustomerSubmit}
              className="mt-4 space-y-3"
            >
              <div className="space-y-1">
                <label
                  htmlFor="contact"
                  className="text-xs font-medium text-slate-300"
                >
                  Phone number or email
                </label>
                <input
                  id="contact"
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  placeholder="e.g. 555-123-4567 or you@example.com"
                />
              </div>

              {error && (
                <p className="text-xs text-red-300/90">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !contact.trim()}
                className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Opening your wallet..." : "Open My Rewards"}
              </button>
            </form>

            <p className="mt-3 text-[11px] text-slate-400/90">
              We use your contact info only to find your existing wallet in this
              location’s loyalty system.
            </p>
          </div>

          {/* Staff / Owner panel */}
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-50">
              For Staff & Owners
            </h2>
            <p className="mt-1 text-sm text-slate-300/80">
              Sign in to the RewardCircle console to add points, redeem rewards,
              and configure program settings for this business.
            </p>

            <ul className="mt-3 space-y-1 text-xs text-slate-400/90">
              <li>• Add points based on purchases</li>
              <li>• Redeem customer rewards at the counter</li>
              <li>• See streaks, tiers, and program stats</li>
            </ul>

            <button
              onClick={goToStaffLogin}
              className="mt-5 w-full rounded-lg border border-slate-500 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Staff / Owner Sign In
            </button>

            <p className="mt-3 text-[11px] text-slate-400/80">
              You&apos;ll be redirected back here after logging in.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}