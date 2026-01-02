"use client";

import { useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { LoyaltyStaffTabs } from "@/components/loyalty/LoyaltyStaffTabs";

type EarnResponse = {
  ok: boolean;
  role: "owner" | "staff" | "customer";
  customerId: string;
  newBalance: number;
  newLifetime: number;
  newTier: string;
  newStreak: number;
  streakBonus: number;
  earnedBase: number;
  error?: string;
};

export default function StaffEarnPage() {
  const { orgId } = useParams<{ orgId: string }>();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setResultMsg(null);

    if (!orgId) {
      setErrorMsg("Missing org context. Please reload the page.");
      return;
    }

    const purchaseAmount = parseFloat(amount);
    if (!phone.trim() || isNaN(purchaseAmount) || purchaseAmount <= 0) {
      setErrorMsg("Enter a valid phone number and purchase amount.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `/api/orgs/${String(orgId)}/loyalty/earn`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            phone: phone.trim(),
            name: name.trim() || undefined,
            purchaseAmount,
          }),
        },
      );

      const data = (await res.json().catch(() => ({}))) as EarnResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setResultMsg(
        `Added ${data.earnedBase} pts${
          data.streakBonus > 0 ? ` + ${data.streakBonus} streak bonus` : ""
        }. New balance: ${data.newBalance} pts. Tier: ${data.newTier.toUpperCase()}.`,
      );

      // Clear amount AFTER success
      setAmount("");
    } catch (err: any) {
      console.error("[StaffEarnPage] add points error:", err);
      setErrorMsg(
        err?.message || "Something went wrong while adding points.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-400/80">
            NeonHQ · RewardCircle
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">
            Staff · Add Points
          </h1>
          <p className="text-sm text-slate-400">
            Enter customer info and purchase amount to award loyalty points.
          </p>
        </header>

        <LoyaltyStaffTabs />

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg"
        >
          <div className="space-y-1">
            <label
              className="text-sm font-medium text-slate-100"
              htmlFor="phone"
            >
              Customer Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              placeholder="e.g. 555-123-4567"
            />
          </div>

          <div className="space-y-1">
            <label
              className="text-sm font-medium text-slate-100"
              htmlFor="name"
            >
              Customer Name (optional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              placeholder="Only for new customers"
            />
          </div>

          <div className="space-y-1">
            <label
              className="text-sm font-medium text-slate-100"
              htmlFor="amount"
            >
              Purchase Amount ($)
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              placeholder="e.g. 23.50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Adding points..." : "Add Points"}
          </button>
        </form>

        {errorMsg && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {errorMsg}
          </div>
        )}

        {resultMsg && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {resultMsg}
          </div>
        )}
      </div>
    </section>
  );
}