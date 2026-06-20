"use client";

export function NeonSection({ children }: { children: React.ReactNode }) {
  return (
    <section className="w-full mx-auto max-w-6xl px-4 py-6 space-y-6">
      {children}
    </section>
  );
}