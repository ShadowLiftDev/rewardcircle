export default function NeonCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`neon-card neon-holo p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}
