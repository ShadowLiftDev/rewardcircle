"use client";

import type { ReactNode } from "react";

type LoyaltyStaffLayoutProps = {
  children: ReactNode;
};

export default function LoyaltyStaffLayout({
  children,
}: LoyaltyStaffLayoutProps) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      {children}
    </div>
  );
}