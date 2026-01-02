import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Owner Login – RewardCircle",
  description:
    "Owner login is currently disabled while we finalize the RewardCircle admin experience.",
};

export default function LegacyLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-50">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-center shadow-[0_0_50px_rgba(56,189,248,0.25)]">
        <div className="mx-auto mb-4 h-10 w-10 rounded-full bg-[radial-gradient(circle_at_30%_30%,#22d3ee,transparent_55%),radial-gradient(circle_at_70%_70%,#6366f1,transparent_55%)]" />
        <h1 className="text-xl font-semibold">Owner Login (Coming Soon)</h1>
        <p className="mt-2 text-sm text-slate-300/80">
          The owner sign-in portal for RewardCircle is temporarily disabled
          while we finalize the admin experience.
        </p>
        <p className="mt-3 text-xs text-slate-400">
          If you&apos;re the owner, access your dashboards directly via the admin
          links provided during setup, or contact your developer to update your
          access flow.
        </p>
      </div>
    </main>
  );
}