"use client";

export function NeonPage({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-50">
      {/* Neon glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-[-10%] h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-20 right-[-10%] h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute bottom-[-20%] left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-[999px] bg-gradient-to-r from-cyan-500/10 via-sky-400/5 to-purple-500/10 blur-3xl" />
      </div>

      {children}
    </main>
  );
}