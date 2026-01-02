import Link from "next/link";

type LoyaltyHomePageProps = {
  params: {
    orgId: string;
  };
};

export default function LoyaltyHomePage({ params }: LoyaltyHomePageProps) {
  const { orgId } = params;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-950">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-emerald-500/10">
        {/* Eyebrow / Title */}
        <div className="text-center space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-400/80">
            NeonHQ · RewardCircle
          </p>
          <h1 className="text-2xl font-bold text-slate-50">
            Loyalty Portal · <span className="font-mono">{orgId}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Choose how you want to enter the loyalty system.
          </p>
        </div>

        {/* Entry choices */}
        <div className="mt-6 grid gap-3">
          <Link
            href={`/orgs/${orgId}/loyalty/customer`}
            className="rounded-lg bg-white text-slate-950 px-4 py-3 text-center text-sm font-semibold hover:bg-slate-100 transition"
          >
            I’m a Customer
          </Link>

          <Link
            href={`/orgs/${orgId}/loyalty/staff/earn`}
            className="rounded-lg border border-slate-500 px-4 py-3 text-center text-sm text-slate-100 hover:bg-white hover:text-slate-950 transition"
          >
            I’m Staff – Add Points
          </Link>

          <Link
            href={`/orgs/${orgId}/loyalty/staff/redeem`}
            className="rounded-lg border border-slate-500 px-4 py-3 text-center text-sm text-slate-100 hover:bg-white hover:text-slate-950 transition"
          >
            I’m Staff – Redeem Rewards
          </Link>

          <Link
            href={`/orgs/${orgId}/loyalty/admin`}
            className="rounded-lg border border-emerald-500/60 px-4 py-3 text-center text-sm text-emerald-200 hover:bg-emerald-500 hover:text-slate-950 transition"
          >
            Admin Dashboard
          </Link>
        </div>

        <p className="mt-4 text-[11px] text-slate-500 text-center">
          Share this link with your team and guests for{" "}
          <span className="font-mono">/orgs/{orgId}/loyalty</span>.
        </p>
      </div>
    </main>
  );
}