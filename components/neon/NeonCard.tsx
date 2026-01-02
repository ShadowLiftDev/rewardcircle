"use client";
import { cn } from "@/lib/utils";

export function NeonCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-slate-800/60 bg-slate-950/70",
        "shadow-[0_0_45px_rgba(56,189,248,0.20)] backdrop-blur-md",
        "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-2xl",
        "before:bg-[conic-gradient(from_140deg,rgba(34,211,238,0.15),rgba(168,85,247,0.18),rgba(16,185,129,0.15),rgba(34,211,238,0.15))] before:blur-xl before:opacity-70",
        className
      )}
    >
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}