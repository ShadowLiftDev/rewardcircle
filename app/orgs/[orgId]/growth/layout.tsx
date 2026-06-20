import Link from "next/link";

type GrowthLayoutProps = {
  children: React.ReactNode;
  params:
    | {
        orgId?: string;
      }
    | Promise<{
        orgId?: string;
      }>;
};

export default async function GrowthLayout({
  children,
  params,
}: GrowthLayoutProps) {
  const resolvedParams = await params;
  const orgId = String(resolvedParams?.orgId ?? "").trim();

  const rewardCircleHref = orgId
    ? `/orgs/${orgId}/growth/reward-circle`
    : "/";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
                OwnerOptics Growth
              </p>
              <h1 className="mt-1 text-lg font-black tracking-tight text-white">
                RewardCircle Console
              </h1>
            </div>

            {orgId && (
              <Link
                href={`/orgs/${orgId}/customer/reward-circle`}
                className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-200 transition hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:text-white"
              >
                View Customer Wallet
              </Link>
            )}
          </div>

          {orgId && (
            <nav className="flex gap-2 overflow-x-auto pb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
              <Link
                href={rewardCircleHref}
                className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-2 transition hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:text-white"
              >
                Overview
              </Link>
              <Link
                href={`/orgs/${orgId}/growth/reward-circle/members`}
                className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-2 transition hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:text-white"
              >
                Members
              </Link>
              <Link
                href={`/orgs/${orgId}/growth/reward-circle/rewards`}
                className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-2 transition hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:text-white"
              >
                Rewards
              </Link>
              <Link
                href={`/orgs/${orgId}/growth/reward-circle/activity`}
                className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-2 transition hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:text-white"
              >
                Activity
              </Link>
              <Link
                href={`/orgs/${orgId}/growth/reward-circle/settings`}
                className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-2 transition hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:text-white"
              >
                Settings
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}