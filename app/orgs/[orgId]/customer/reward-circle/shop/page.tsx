import { Suspense } from "react";
import RewardCircleShopClient from "./RewardCircleShopClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params:
    | {
        orgId?: string;
      }
    | Promise<{
        orgId?: string;
      }>;
};

export default async function RewardCircleShopPage({ params }: PageProps) {
  const resolvedParams = await params;
  const orgId = String(resolvedParams?.orgId ?? "").trim();

  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200">
              Loading Reward Shop...
            </p>
          </div>
        </main>
      }
    >
      <RewardCircleShopClient orgId={orgId} />
    </Suspense>
  );
}