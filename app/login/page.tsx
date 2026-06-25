import type { Metadata } from "next";
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Admin Login – RewardCircle",
  description:
    "Sign in to manage RewardCircle rewards, members, points, tiers, and redemptions.",
};

function LoginFallback() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-50">
      <section className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-[0_0_60px_rgba(34,211,238,0.18)] backdrop-blur-xl">
          <p className="text-center text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200">
            Admin Engine
          </p>

          <h1 className="mt-3 text-center text-4xl font-black uppercase leading-none tracking-[-0.06em] text-white">
            RewardCircle
            <span className="block bg-gradient-to-r from-cyan-200 via-emerald-200 to-fuchsia-200 bg-clip-text text-transparent">
              Login
            </span>
          </h1>

          <p className="mt-4 text-center text-sm leading-6 text-slate-400">
            Loading login surface…
          </p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}