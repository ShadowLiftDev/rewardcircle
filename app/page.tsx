"use client";

import Link from "next/link";

const DEFAULT_ORG =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "neon-lunchbox";

export default function RewardCircleLanding() {
  const customerWalletHref = `/orgs/${DEFAULT_ORG}/customer/reward-circle`;
  const rewardShopHref = `/orgs/${DEFAULT_ORG}/customer/reward-circle/shop`;
  const growthConsoleHref = `/orgs/${DEFAULT_ORG}/growth/reward-circle`;
  const joinHref = `/orgs/${DEFAULT_ORG}/join`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-slate-50">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-18rem] h-[34rem] w-[54rem] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute left-[-10rem] top-32 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-[110px]" />
        <div className="absolute right-[-12rem] top-20 h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/10 blur-[120px]" />
        <div className="absolute bottom-[-18rem] left-1/2 h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400/10 via-emerald-400/5 to-fuchsia-400/10 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-50 rounded-[1.5rem] border border-white/10 bg-slate-950/70 px-4 py-3 shadow-[0_0_50px_rgba(34,211,238,0.08)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-10 w-10">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-300 via-emerald-300 to-fuchsia-400 blur-[5px]" />
                <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-white/20 bg-slate-950 text-[11px] font-black tracking-[0.18em] text-white">
                  RC
                </div>
              </div>

              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-white">
                  RewardCircle
                </p>
                <p className="text-[11px] font-medium text-slate-400">
                  Earned-value engine by OwnerOptics
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400 md:flex">
              <a href="#loop" className="transition hover:text-cyan-200">
                Loop
              </a>
              <a href="#surfaces" className="transition hover:text-cyan-200">
                Surfaces
              </a>
              <a href="#fit" className="transition hover:text-cyan-200">
                Best Fit
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href={joinHref}
                className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-emerald-300/60 hover:bg-emerald-300/10 hover:text-white sm:inline-flex"
              >
                Join
              </Link>

              <Link
                href={customerWalletHref}
                className="rounded-full border border-cyan-300/50 bg-cyan-300 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_30px_rgba(103,232,249,0.25)] transition hover:bg-white"
              >
                Open Wallet
              </Link>
            </div>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.9)]" />
              OwnerOptics · Retention Layer
            </div>

            <div className="space-y-5">
              <h1 className="max-w-5xl text-5xl font-black uppercase leading-[0.9] tracking-[-0.075em] text-white sm:text-7xl lg:text-8xl">
                Turn visits into{" "}
                <span className="block bg-gradient-to-r from-cyan-200 via-emerald-200 to-fuchsia-300 bg-clip-text text-transparent">
                  earned value.
                </span>
              </h1>

              <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                RewardCircle gives businesses a clear points, wallet, tier, and
                reward shop system. Customers can see what they have earned,
                owners can control the reward loop, and every return visit
                becomes easier to understand.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={customerWalletHref}
                className="rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_45px_rgba(56,189,248,0.35)] transition hover:scale-[1.01] hover:brightness-110"
              >
                Open Customer Wallet
              </Link>

              <Link
                href={rewardShopHref}
                className="rounded-2xl border border-emerald-300/40 bg-emerald-300/10 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950"
              >
                View Reward Shop
              </Link>

              <Link
                href={growthConsoleHref}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:text-white"
              >
                Growth Console
              </Link>
            </div>

            <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-2xl font-black text-cyan-200">Wallet</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Customers see points, tiers, and progress.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-2xl font-black text-emerald-200">Shop</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Rewards turn earned value into action.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-2xl font-black text-fuchsia-200">
                  Console
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Owners manage the program from growth.
                </p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-[conic-gradient(from_140deg,rgba(34,211,238,0.18),rgba(217,70,239,0.16),rgba(16,185,129,0.14),rgba(34,211,238,0.18))] blur-3xl" />

            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-4 shadow-[0_30px_100px_rgba(2,6,23,0.95)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>Customer Wallet</span>
                <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-emerald-200">
                  Wallet Open
                </span>
              </div>

              <div className="rounded-[1.5rem] border border-cyan-300/20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                      RewardCircle Member
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-white">
                      Neon Regular
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      1,250 lifetime points earned
                    </p>
                  </div>

                  <div className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/80">
                      Available
                    </p>
                    <p className="text-3xl font-black text-cyan-100">420</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/70">
                      Points
                    </p>
                  </div>
                </div>

                <div className="mt-7 space-y-2">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    <span>Tier Progress</span>
                    <span>75%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-fuchsia-300 shadow-[0_0_25px_rgba(103,232,249,0.5)]" />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>1,000 pts</span>
                    <span>2,000 pts → VIP</span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Next Reward
                    </p>
                    <p className="mt-2 text-sm font-bold text-white">
                      Free Dessert
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      80 points away
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Loop Status
                    </p>
                    <p className="mt-2 text-sm font-bold text-emerald-200">
                      Return Ready
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Value is visible.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                  <p className="text-lg font-black text-white">12</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    Visits
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                  <p className="text-lg font-black text-white">4</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    Rewards
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                  <p className="text-lg font-black text-white">VIP</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    Next
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="loop" className="space-y-6 py-10">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-300/80">
              The Reward Loop
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-white sm:text-5xl">
              Engage. Earn. Redeem. Return.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              RewardCircle is built around one simple loop: give customers a
              reason to return, make their value visible, and let the program
              reinforce itself over time.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                label: "01",
                title: "Join",
                text: "Customers enter through the join flow and receive a wallet tied to the organization.",
              },
              {
                label: "02",
                title: "Earn",
                text: "Visits, purchases, bonuses, and program actions increase their available value.",
              },
              {
                label: "03",
                title: "Redeem",
                text: "The reward shop shows what points can become, from perks to premium offers.",
              },
              {
                label: "04",
                title: "Return",
                text: "Visible progress gives customers a reason to come back and climb higher.",
              },
            ].map((item) => (
              <article
                key={item.label}
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.06]"
              >
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                  {item.label}
                </p>
                <h3 className="mt-5 text-2xl font-black uppercase tracking-[-0.04em] text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="surfaces" className="space-y-6 py-10">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300/80">
              Product Surfaces
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-white sm:text-5xl">
              Three views. One value system.
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Link
              href={customerWalletHref}
              className="group rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.055] p-6 transition hover:-translate-y-1 hover:border-cyan-300/60"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">
                Customer
              </p>
              <h3 className="mt-5 text-3xl font-black uppercase tracking-[-0.05em] text-white">
                Wallet
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Customers see points, tiers, progress, and earned value in a
                simple public-facing wallet.
              </p>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                Open Wallet →
              </p>
            </Link>

            <Link
              href={rewardShopHref}
              className="group rounded-[2rem] border border-emerald-300/20 bg-emerald-300/[0.055] p-6 transition hover:-translate-y-1 hover:border-emerald-300/60"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-200">
                Rewards
              </p>
              <h3 className="mt-5 text-3xl font-black uppercase tracking-[-0.05em] text-white">
                Shop
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                The reward shop turns points into visible incentives that make
                returning feel valuable.
              </p>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                View Shop →
              </p>
            </Link>

            <Link
              href={growthConsoleHref}
              className="group rounded-[2rem] border border-fuchsia-300/20 bg-fuchsia-300/[0.055] p-6 transition hover:-translate-y-1 hover:border-fuchsia-300/60"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-fuchsia-200">
                Growth
              </p>
              <h3 className="mt-5 text-3xl font-black uppercase tracking-[-0.05em] text-white">
                Console
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Owners manage rewards, members, activity, program rules, and
                the health of the retention loop.
              </p>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-fuchsia-200">
                Open Console →
              </p>
            </Link>
          </div>
        </section>

        <section id="fit" className="space-y-6 py-10">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-fuchsia-300/80">
              Best Fit
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-white sm:text-5xl">
              Built for repeat-visit businesses.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              RewardCircle works best anywhere customers return, collect value,
              and respond to a clear reason to come back.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Restaurants & Bars",
                tone: "text-cyan-200",
                points: [
                  "Reward return visits and repeat tabs.",
                  "Promote slow-night offers and special events.",
                  "Turn regulars into visible VIPs.",
                ],
              },
              {
                title: "Cafes & Bakeries",
                tone: "text-emerald-200",
                points: [
                  "Replace punch cards with a wallet.",
                  "Reward daily habits and streaks.",
                  "Create simple points-to-perks offers.",
                ],
              },
              {
                title: "Salons & Services",
                tone: "text-fuchsia-200",
                points: [
                  "Reward appointments and rebooking.",
                  "Offer add-ons, upgrades, and milestones.",
                  "Keep customers moving toward the next visit.",
                ],
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5"
              >
                <h3
                  className={`text-sm font-black uppercase tracking-[0.18em] ${item.tone}`}
                >
                  {item.title}
                </h3>

                <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-400">
                  {item.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/10 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>RewardCircle · powered by OwnerOptics</span>
          <div className="flex gap-4">
            <Link href={customerWalletHref} className="hover:text-cyan-200">
              Wallet
            </Link>
            <Link href={rewardShopHref} className="hover:text-emerald-200">
              Shop
            </Link>
            <Link href={growthConsoleHref} className="hover:text-fuchsia-200">
              Growth
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}