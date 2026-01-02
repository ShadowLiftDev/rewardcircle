"use client";

import { useState } from "react";
import Link from "next/link";

const ORG_DEMO_ID = "neon-lunchbox"; // change if your demo orgId differs

type TabId = "admin" | "staff" | "customer";

const TABS: { id: TabId; label: string; eyebrow: string }[] = [
  { id: "admin", label: "Owner / Admin", eyebrow: "Configure & monitor" },
  { id: "staff", label: "Staff at POS", eyebrow: "Day-to-day usage" },
  { id: "customer", label: "Customer View", eyebrow: "What guests see" },
];

export default function RewardCircleDemoPage() {
  const [activeTab, setActiveTab] = useState<TabId>("admin");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-400/80">
              RewardCircle · Guided Demo
            </p>
            <h1 className="text-2xl font-semibold sm:text-3xl">
              See how RewardCircle works in&nbsp;
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                real life
              </span>
              .
            </h1>
            <p className="max-w-xl text-xs sm:text-sm text-slate-400">
              Use the tabs below to walk through the app from the perspective of an
              owner, your staff at the bar or register, and the customer checking
              their points.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/orgs/${ORG_DEMO_ID}/loyalty/admin`}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Open live demo (admin)
            </Link>
            <Link
              href={`/orgs/${ORG_DEMO_ID}/loyalty/staff/earn`}
              className="rounded-lg border border-slate-600 px-4 py-2 text-xs text-slate-100 hover:bg-slate-900"
            >
              Staff earn screen
            </Link>
          </div>
        </header>

        {/* Tabs */}
        <nav className="inline-flex overflow-hidden rounded-full border border-slate-800 bg-slate-950/80 p-1 text-xs">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "px-4 py-1.5 rounded-full transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-300 hover:bg-slate-800 hover:text-slate-50",
                ].join(" ")}
              >
                <span className="block text-[10px] uppercase tracking-wide">
                  {tab.eyebrow}
                </span>
                <span className="text-xs font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content area */}
        <section className="space-y-4">
          {activeTab === "admin" && <AdminWalkthrough />}
          {activeTab === "staff" && <StaffWalkthrough />}
          {activeTab === "customer" && <CustomerWalkthrough />}
        </section>

        {/* Footer links */}
        <footer className="mt-4 flex flex-col gap-2 border-t border-slate-800 pt-4 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>RewardCircle is part of the NeonHQ toolset.</span>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/orgs/${ORG_DEMO_ID}/loyalty/admin`}
              className="hover:text-slate-200"
            >
              Open admin dashboard →
            </Link>
            <Link
              href={`/orgs/${ORG_DEMO_ID}/loyalty/staff/earn`}
              className="hover:text-slate-200"
            >
              Try staff “Earn Points” →
            </Link>
            <Link
              href={`/orgs/${ORG_DEMO_ID}/loyalty/staff/redeem`}
              className="hover:text-slate-200"
            >
              Try staff “Redeem” →
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* -------------------- Admin walkthrough -------------------- */

function AdminWalkthrough() {
  const orgBase = `/orgs/${ORG_DEMO_ID}/loyalty/admin`;

  const steps = [
    {
      step: "Step 1",
      title: "Open the Loyalty Admin dashboard",
      body: "Owners log in and land on a simple dashboard showing member count, total points issued, and recent activity. No spreadsheets, no exports.",
      href: orgBase,
      hrefLabel: "Open admin dashboard",
    },
    {
      step: "Step 2",
      title: "Set your points and tiers",
      body: "Inside Program Settings you define points per $1, tier thresholds (Regular, VIP, Legend), and optional streak bonuses for repeat visits.",
      href: `${orgBase}/settings`,
      hrefLabel: "Go to Program Settings",
    },
    {
      step: "Step 3",
      title: "Create rewards for the store",
      body: "Define rewards like “Free Dessert” or “$10 Off” with point costs and sort order. Staff and customers will see the same store everywhere.",
      href: `${orgBase}/rewards`,
      hrefLabel: "Go to Rewards",
    },
    {
      step: "Step 4",
      title: "Monitor your top customers",
      body: "Use the Customers tab to search guests by phone or name, see their balance, lifetime points, and recent activity.",
      href: `${orgBase}/customers`,
      hrefLabel: "Go to Customers",
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-50">
        Owner / Admin view
      </h2>
      <p className="text-xs text-slate-400">
        This is the control room: you define the rules once, then let staff and
        customers play inside that system.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((s) => (
          <StepCard
            key={s.title}
            step={s.step}
            title={s.title}
            body={s.body}
            href={s.href}
            hrefLabel={s.hrefLabel}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------- Staff walkthrough -------------------- */

function StaffWalkthrough() {
  const staffBase = `/orgs/${ORG_DEMO_ID}/loyalty/staff`;

  const steps = [
    {
      step: "Step 1",
      title: "Lookup the guest",
      body: "Staff start on the Earn screen, search by phone number, and confirm the guest’s name and current points balance.",
      href: `${staffBase}/earn`,
      hrefLabel: "Open Earn Points",
    },
    {
      step: "Step 2",
      title: "Enter the ticket amount",
      body: "They type in the check total. RewardCircle automatically calculates how many points to add based on your rules (e.g. 10 pts per $1).",
      href: `${staffBase}/earn`,
      hrefLabel: "Try entering a fake ticket",
    },
    {
      step: "Step 3",
      title: "Redeem a reward at checkout",
      body: "On the Redeem tab, staff pick from the configured rewards. The system deducts the points and logs the transaction instantly.",
      href: `${staffBase}/redeem`,
      hrefLabel: "Open Redeem Rewards",
    },
    {
      step: "Step 4",
      title: "Keep the tab open on the bar iPad",
      body: "RewardCircle is designed to stay open on a POS tablet so staff can flip between Earn and Redeem all night without reloading.",
      href: `${staffBase}/earn`,
      hrefLabel: "View staff experience",
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-50">Staff view</h2>
      <p className="text-xs text-slate-400">
        Staff only need two screens: Earn and Redeem. Everything else happens
        behind the scenes.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((s) => (
          <StepCard
            key={s.title}
            step={s.step}
            title={s.title}
            body={s.body}
            href={s.href}
            hrefLabel={s.hrefLabel}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------- Customer walkthrough -------------------- */

function CustomerWalkthrough() {
  const customerBase = `/orgs/${ORG_DEMO_ID}/loyalty/customer`;

  const steps = [
    {
      step: "Step 1",
      title: "Customer opens their wallet",
      body: "Guests can log into a simple wallet view to see points, tier, and progress to the next milestone.",
      href: customerBase,
      hrefLabel: "Open customer wallet (demo)",
    },
    {
      step: "Step 2",
      title: "See points & next reward",
      body: "The wallet highlights how many points are available right now and what reward they’re closest to unlocking.",
      href: customerBase,
      hrefLabel: "View wallet layout",
    },
    {
      step: "Step 3",
      title: "Watch tiers climb over time",
      body: "As they visit, lifetime points go up and the tier bar advances: Regular → VIP → Legend, or whatever names you’ve chosen.",
      href: customerBase,
      hrefLabel: "Preview tiers",
    },
    {
      step: "Step 4",
      title: "Connect the story to your brand",
      body: "You can theme tier names and rewards around your brand (Neon Regular, Time Traveler, etc.), making loyalty feel like part of the experience.",
      href: customerBase,
      hrefLabel: "Imagine your branding here",
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-50">
        Customer view
      </h2>
      <p className="text-xs text-slate-400">
        This is what your regulars feel: visible progress, clear rewards, and a
        reason to come back one more time.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((s) => (
          <StepCard
            key={s.title}
            step={s.step}
            title={s.title}
            body={s.body}
            href={s.href}
            hrefLabel={s.hrefLabel}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------- Shared StepCard -------------------- */

type StepCardProps = {
  step: string;
  title: string;
  body: string;
  href?: string;
  hrefLabel?: string;
};

function StepCard({ step, title, body, href, hrefLabel }: StepCardProps) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      {/* Screenshot placeholder */}
      <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/70 text-[11px] text-slate-500">
        Screenshot / photo placeholder
      </div>

      {/* Text content */}
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
          {step}
        </div>
        <h3 className="text-sm font-semibold text-slate-50">{title}</h3>
        <p className="text-xs leading-relaxed text-slate-300">{body}</p>
      </div>

      {href && hrefLabel && (
        <div className="pt-1">
          <Link
            href={href}
            className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300"
          >
            {hrefLabel} →
          </Link>
        </div>
      )}
    </article>
  );
}