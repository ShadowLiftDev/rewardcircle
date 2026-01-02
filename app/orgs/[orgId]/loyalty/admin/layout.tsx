"use client";

import type { ReactNode } from "react";

type LoyaltyAdminLayoutProps = {
  children: ReactNode;
};

export default function LoyaltyAdminLayout({
  children,
}: LoyaltyAdminLayoutProps) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      {children}
    </div>
  );
}