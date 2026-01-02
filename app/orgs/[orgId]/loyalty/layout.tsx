"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { getClientDb } from "@/lib/firebase-client";
import { useAuth } from "@/components/auth/AuthProvider";

import { NeonPage } from "@/components/neon/NeonPage";
import { NeonSection } from "@/components/neon/NeonSection";

export default function OrgLayout({ children }: { children: ReactNode }) {
  const { orgId } = useParams<{ orgId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [orgName, setOrgName] = useState<string>("");

  useEffect(() => {
    if (!orgId) return;
    let alive = true;

    (async () => {
      try {
        const db = getClientDb();
        const snap = await getDoc(doc(db, "orgs", String(orgId)));
        if (!alive) return;
        setOrgName(snap.exists() ? snap.data()?.name ?? String(orgId) : String(orgId));
      } catch {
        setOrgName(String(orgId));
      }
    })();

    return () => { alive = false; };
  }, [orgId]);

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  const displayName = orgName || orgId || "Your business";

  return (
    <NeonPage>
      <NeonSection>
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400/90">
              {displayName}
            </p>
            <h1 className="text-lg font-semibold text-slate-50">
              Business Console
            </h1>
            <p className="text-xs text-slate-400">
              Manage loyalty, referrals, and more for your location.
            </p>
          </div>

          {user && (
            <button
              onClick={handleSignOut}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-100 hover:text-slate-900"
            >
              Sign out
            </button>
          )}
        </header>

        <div className="pt-2">{children}</div>
      </NeonSection>
    </NeonPage>
  );
}