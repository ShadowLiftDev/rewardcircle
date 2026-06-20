"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

type OrgParams = { orgId: string };

const TAB_DEFS = [
  {
    slug: "",
    label: "Dashboard",
    description: "Overview",
  },
  {
    slug: "settings",
    label: "Settings",
    description: "Program rules",
  },
  {
    slug: "rewards",
    label: "Rewards",
    description: "Store items",
  },
  {
    slug: "customers",
    label: "Customers",
    description: "Members",
    matchChildren: true, // covers /customers and /customers/[id]
  },
];

export function LoyaltyAdminTabs() {
  const { orgId } = useParams<OrgParams>();
  const pathname = usePathname();

  if (!orgId) return null;

  const base = `/orgs/${orgId}/loyalty/admin`;

  return (
    <nav className="mt-4 flex overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-1 text-xs">
      <div className="flex gap-1">
        {TAB_DEFS.map((tab) => {
          const href = tab.slug ? `${base}/${tab.slug}` : base;

          const isActive =
            tab.slug === ""
              ? pathname === base
              : tab.matchChildren
              ? pathname.startsWith(href)
              : pathname === href;

          return (
            <Link
              key={tab.slug || "dashboard"}
              href={href}
              className={`flex min-w-[130px] flex-col rounded-lg px-3 py-2 transition ${
                isActive
                  ? "bg-cyan-500/15 border border-cyan-400/60 text-slate-50"
                  : "border border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-900/80 hover:text-slate-100"
              }`}
            >
              <span className="text-[11px] font-semibold tracking-wide">
                {tab.label}
              </span>
              <span className="text-[10px] text-slate-500">
                {tab.description}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}