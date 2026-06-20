export function NeonBackground({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen neon-bg text-slate-50 pb-20">
      {children}
    </main>
  );
}