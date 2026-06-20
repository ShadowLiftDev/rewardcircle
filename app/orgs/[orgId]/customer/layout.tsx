import Link from "next/link";

type CustomerLayoutProps = {
  children: React.ReactNode;
  params:
    | {
        orgId?: string;
      }
    | Promise<{
        orgId?: string;
      }>;
};

export default async function CustomerLayout({
  children,
  params,
}: CustomerLayoutProps) {
  const resolvedParams = await params;
  const orgId = String(resolvedParams?.orgId ?? "").trim();

  const joinHref = orgId ? `/orgs/${orgId}/join` : "/";

  return (
    <div className="min-h-screen">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-slate-950/65 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href={orgId ? `/orgs/${orgId}/customer/reward-circle` : "/"}
            className="group inline-flex items-center gap-2"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
            <span className="text-sm font-black uppercase tracking-[0.28em] text-slate-100">
              RewardCircle
            </span>
          </Link>

          <nav className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            {orgId && (
              <>
                <Link
                  href={`/orgs/${orgId}/customer/reward-circle`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 transition hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:text-white"
                >
                  Wallet
                </Link>
                <Link
                  href={`/orgs/${orgId}/customer/reward-circle/shop`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 transition hover:border-fuchsia-300/60 hover:bg-fuchsia-300/10 hover:text-white"
                >
                  Shop
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="pt-16">{children}</main>
    </div>
  );
}