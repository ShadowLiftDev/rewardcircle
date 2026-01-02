import Link from "next/link";

const DEFAULT_ORG =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "neon-lunchbox";

export default function RewardCircleLanding() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      {/* Neon background glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-[-10%] h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-20 right-[-10%] h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute bottom-[-20%] left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-[999px] bg-gradient-to-r from-cyan-500/10 via-sky-400/5 to-purple-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-12">
        {/* Header / nav */}
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/60 bg-slate-950/60 px-4 py-3 shadow-[0_0_40px_rgba(12,148,136,0.15)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400 via-emerald-400 to-indigo-500 blur-[3px]" />
              <div className="relative flex h-full w-full items-center justify-center rounded-full bg-slate-950/80 text-[10px] font-semibold tracking-wide ring-2 ring-cyan-400/60">
                RC
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-50">
                RewardCircle
              </span>
              <span className="text-[11px] text-slate-400">
                Neon-smooth loyalty for real-world teams.
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-4 text-[11px] text-slate-300 sm:text-xs">
            <a href="#how-it-works" className="hover:text-white">
              How it works
            </a>
            <a href="#benefits" className="hover:text-white">
              Benefits
            </a>
            <a href="#examples" className="hidden sm:inline hover:text-white">
              Examples
            </a>
            {/* Primary header button → experience */}
            <Link
              href={`/orgs/${DEFAULT_ORG}/loyalty`}
              className="rounded-full border border-cyan-400/80 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-cyan-100 shadow-[0_0_25px_rgba(34,211,238,0.35)] transition hover:bg-cyan-400 hover:text-slate-950"
            >
              Enter the Experience
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="grid items-center gap-10 md:grid-cols-[1.3fr_minmax(0,1fr)]">
          <div className="space-y-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-cyan-300/80">
              NeonHQ · Loyalty Engine
            </p>

            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl sm:leading-[1.05]">
              Turn everyday guests into{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-emerald-300 to-purple-400 bg-clip-text text-transparent">
                neon-level regulars.
              </span>
            </h1>

            <p className="max-w-xl text-sm text-slate-300/90 sm:text-base">
              RewardCircle gives you a points-based loyalty system that{" "}
              <span className="font-semibold text-cyan-200">
                staff can run in seconds
              </span>{" "}
              and{" "}
              <span className="font-semibold text-purple-200">
                customers actually understand
              </span>
              . One clean dashboard, no plastic cards, no clunky apps.
            </p>

            {/* Hero CTAs – all go to the live experience */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/orgs/${DEFAULT_ORG}/loyalty`}
                className="rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_40px_rgba(56,189,248,0.45)] transition hover:brightness-110"
              >
                Enter the Experience
              </Link>
              <Link
                href={`/rewardcircle/demo`}
                className="rounded-xl border border-cyan-400/60 bg-slate-950/80 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400 hover:text-slate-950"
              >
                Can You Show Me?
              </Link>
              {/* optional 3rd button; delete if you only want 2 */}
              {/* <Link
                href={`/orgs/${DEFAULT_ORG}/loyalty`}
                className="text-sm text-slate-300 hover:text-white"
              >
                Enter the Experience → 
              </Link> */}
            </div>

            {/* Tiny stat strip */}
            <div className="flex flex-wrap gap-4 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Designed for bars, cafes, salons, and neighborhood spots.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span>No apps to install · runs on any tablet or laptop.</span>
              </div>
            </div>
          </div>

          {/* “Holographic” screenshot card */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-[conic-gradient(from_140deg,rgba(34,211,238,0.1),rgba(168,85,247,0.18),rgba(16,185,129,0.12),rgba(34,211,238,0.1))] opacity-80 blur-2xl" />
            <div className="space-y-4 rounded-3xl border border-slate-700/80 bg-slate-900/80 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.9)] backdrop-blur">
              <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>Customer view · Live wallet</span>
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                  3-day streak
                </span>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-50">
                      Hi, Taylor
                    </div>
                    <div className="text-[11px] text-slate-400">
                      1,250 lifetime pts · Member since 2024
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">
                      Current Tier
                    </div>
                    <div className="text-lg font-bold text-cyan-300">
                      Neon Regular
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-[11px] text-slate-400">
                    Progress to next tier
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-3/4 bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400" />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                    <span>1,000 pts</span>
                    <span>2,000 pts → VIP</span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-700/80 bg-slate-950/80 p-3">
                    <div className="text-[11px] text-slate-400">
                      Points available
                    </div>
                    <div className="text-2xl font-bold text-slate-50">
                      420 pts
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Next reward:{" "}
                      <span className="font-semibold">Free Dessert</span>{" "}
                      (500 pts)
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-700/80 bg-slate-950/80 p-3">
                    <div className="text-[11px] text-slate-400">
                      Today&apos;s visit
                    </div>
                    <div className="mt-1 text-sm text-slate-200">
                      +130 pts earned
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-300/90">
                      +50 streak bonus applied
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-50">
            How RewardCircle works
          </h2>
          <div className="grid gap-4 text-sm text-slate-300 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 p-4 shadow-[0_0_25px_rgba(15,23,42,0.7)]">
              <div className="mb-1 text-xs font-semibold text-cyan-300">
                1 · Earn points
              </div>
              <p>
                Staff enter the ticket amount and tap once. RewardCircle applies
                your rules (e.g.{" "}
                <span className="font-semibold">10 pts per $1</span>) and
                streak bonuses automatically.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 p-4 shadow-[0_0_25px_rgba(15,23,42,0.7)]">
              <div className="mb-1 text-xs font-semibold text-cyan-300">
                2 · Climb tiers
              </div>
              <p>
                Guests unlock tiers like <em>Regular</em>, <em>VIP</em>, or{" "}
                <em>Legend</em> as they hit milestones, with a clear progress
                bar they can see anytime.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 p-4 shadow-[0_0_25px_rgba(15,23,42,0.7)]">
              <div className="mb-1 text-xs font-semibold text-cyan-300">
                3 · Redeem rewards
              </div>
              <p>
                Staff pull up a guest by phone number, pick a reward (free
                appetizer, dessert, drink), and points are deducted instantly.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section id="benefits" className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-50">
            Built for small, mighty teams
          </h2>
          <div className="grid gap-4 text-sm text-slate-300 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
              <div className="mb-1 font-semibold">Fast for staff</div>
              <p>
                One screen to add points, one screen to redeem. No plastic
                cards, QR drama, or extra hardware required.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
              <div className="mb-1 font-semibold">Clear for customers</div>
              <p>
                Guests see points, tier, and “next reward” in one place, so they
                always know how close they are to something free.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
              <div className="mb-1 font-semibold">Simple for owners</div>
              <p>
                Your admin dashboard shows member count, total points issued,
                and top customers at a glance — no spreadsheets.
              </p>
            </div>
          </div>
        </section>

        {/* Examples / Use cases by business type */}
        <section id="examples" className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-50">
            Where RewardCircle fits best
          </h2>
          <p className="text-sm text-slate-300/90">
            Any place with regular guests can run a simple, neon-smooth loyalty
            loop. Here are a few of the most common setups:
          </p>

          <div className="grid gap-4 text-sm text-slate-300 md:grid-cols-3">
            {/* Restaurants & Bars */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Restaurants &amp; Bars
              </div>
              <p className="mb-2 text-xs text-slate-400">
                Reward people who eat, drink, and bring friends.
              </p>
              <ul className="list-disc space-y-1 pl-4 text-[13px]">
                <li>Points for every tab or ticket amount.</li>
                <li>Bonus points on slow nights or themed events.</li>
                <li>Free appetizer / dessert after a set number of visits.</li>
                <li>VIP tier with priority seating or special menus.</li>
              </ul>
            </div>

            {/* Cafes & Bakeries */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Cafes &amp; Bakeries
              </div>
              <p className="mb-2 text-xs text-slate-400">
                Turn daily coffee runs into a habit that stays with you.
              </p>
              <ul className="list-disc space-y-1 pl-4 text-[13px]">
                <li>Replace paper punch-cards with a phone-based wallet.</li>
                <li>Reward “regular order” streaks with bonus points.</li>
                <li>Free pastry or drink every few visits.</li>
                <li>
                  Early access to new drinks or seasonal drops for top tiers.
                </li>
              </ul>
            </div>

            {/* Salons, Studios & Services */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">
                Salons, Studios &amp; Services
              </div>
              <p className="mb-2 text-xs text-slate-400">
                Keep clients coming back on schedule—and excited to upgrade.
              </p>
              <ul className="list-disc space-y-1 pl-4 text-[13px]">
                <li>Points for every appointment or package purchased.</li>
                <li>Bonus points for rebooking before they leave.</li>
                <li>Free add-ons (treatment, gloss, extra time) for higher tiers.</li>
                <li>
                  Anniversary or birthday rewards to make clients feel seen.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <footer className="flex justify-between border-t border-slate-800 pt-4 text-xs text-slate-500">
          <span>RewardCircle · part of NeonHQ</span>
        </footer>
      </div>
    </main>
  );
}