"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProgramSettings } from "@/lib/types";
import { getOrgId } from "@/lib/org";

import {
  fetchProgramSettingsForOrg,
  saveProgramSettingsForOrg,
} from "@/lib/loyalty-admin";

import { LoyaltySettingsForm } from "@/components/loyalty/LoyaltySettingsForm";

type PageProps = {
  params: {
    orgId: string;
  };
};

export default function LoyaltyAdminSettingsPage({ params }: PageProps) {
  // Prefer env-locked orgId (neon-lunchbox), fall back to URL param if needed
  const envOrgId = getOrgId();
  const orgId = envOrgId ?? params.orgId;

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [initialSettings, setInitialSettings] =
    useState<ProgramSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);

        const settings = await fetchProgramSettingsForOrg(orgId);
        if (!alive) return;

        console.log("[LoyaltyAdminSettings] loaded settings:", settings);
        setInitialSettings(settings);
      } catch (e: any) {
        console.error("[LoyaltyAdminSettings] load error:", e);
        if (!alive) return;
        setError(e?.message || "Failed to load program settings.");
        setInitialSettings(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [orgId]);

  async function handleSave(settings: ProgramSettings) {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await saveProgramSettingsForOrg(orgId, settings);
      setSuccess("Program settings saved.");
      setInitialSettings(settings);
    } catch (e: any) {
      console.error("[LoyaltyAdminSettings] save error:", e);
      setError(e?.message || "Failed to save program settings.");
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-400/80">
          NeonHQ · RewardCircle
        </p>
        <h1 className="text-2xl font-semibold text-slate-50">
          Program Settings
        </h1>
        <p className="text-sm text-slate-400">
          Control how points, tiers, and streak bonuses work.
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push(`/orgs/${orgId}/loyalty/admin`)}
        className="rounded-md border border-slate-600 px-3 py-1.5 text-xs hover:bg-white hover:text-black"
      >
        Back to Dashboard
      </button>
    </div>
  );

  // 1) Loading state
  if (loading && !initialSettings && !error) {
    return (
      <section className="space-y-6">
        {header}
        <p className="text-sm text-slate-400">Loading program settings…</p>
      </section>
    );
  }

  // 2) Error state with no settings loaded
  if (error && !initialSettings) {
    return (
      <section className="space-y-6">
        {header}
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      </section>
    );
  }

  // 3) Normal state – we have settings
  return (
    <section className="space-y-6">
      {header}

      {initialSettings && (
        <LoyaltySettingsForm
          initialSettings={initialSettings}
          saving={saving}
          error={error}
          success={success}
          onSubmit={handleSave}
        />
      )}
    </section>
  );
}