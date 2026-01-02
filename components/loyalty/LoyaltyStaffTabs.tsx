"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

type OrgParams = { orgId: string };

type StaffTab = {
  id: string;
  label: string;
  href: (orgId: string) => string;
  description?: string;
};

const STAFF_TABS: StaffTab[] = [
  {
    id: "earn",
    label: "Earn Points",
    href: (orgId) => `/orgs/${orgId}/loyalty/staff/earn`,
    description: "Add points after a guest pays.",
  },
  {
    id: "redeem",
    label: "Redeem Rewards",
    href: (orgId) => `/orgs/${orgId}/loyalty/staff/redeem`,
    description: "Use points for rewards at checkout.",
  },
  // later we can add more, e.g.:
  // {
  //   id: "lookup",
  //   label: "Customer Lookup",
  //   href: (orgId) => `/orgs/${orgId}/loyalty/staff/customers`,
  // },
];

export function LoyaltyStaffTabs() {
  const { orgId } = useParams<OrgParams>();
  const pathname = usePathname();

  if (!orgId) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex overflow-hidden rounded-full border border-slate-700 bg-slate-900/80 p-1 text-xs">
        {STAFF_TABS.map((tab) => {
          const href = tab.href(String(orgId));
          const isActive =
            pathname === href ||
            (pathname?.startsWith(href) && href !== `/orgs/${orgId}/loyalty/staff`);

          return (
            <Link
              key={tab.id}
              href={href}
              className={[
                "px-3 py-1.5 rounded-full font-medium transition-colors",
                "whitespace-nowrap",
                isActive
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-300 hover:bg-slate-800 hover:text-slate-50",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Optional helper text for staff */}
      <div className="hidden text-[11px] text-slate-400 sm:block">
        Tip: keep this tab open on the bar / POS tablet so staff can flip
        between <span className="font-semibold text-emerald-300">Earn</span>{" "}
        and <span className="font-semibold text-emerald-300">Redeem</span>{" "}
        quickly.
      </div>
    </div>
  );
}