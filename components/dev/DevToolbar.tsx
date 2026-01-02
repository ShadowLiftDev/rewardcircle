"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TESTMODE === "1";
const DEFAULT_ORG = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || "neon-lunchbox";

export default function DevToolbar() {
  const router = useRouter();
  const pathname = usePathname();

  // Derive org from /orgs/:orgId/...
  const orgId = useMemo(() => {
    const m = pathname?.match(/^\/orgs\/([^/]+)/);
    return (m?.[1] || DEFAULT_ORG) as string;
  }, [pathname]);

  const [on, setOn] = useState(false);
  const [role, setRole] = useState<"owner" | "staff" | "customer">("owner");
  const [key, setKey] = useState<string>("");
  const [inputKey, setInputKey] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  // hydrate from localStorage
  useEffect(() => {
    if (!ENABLED) return;
    try {
      const cur = localStorage.getItem("dev:testmode") === "on";
      const r = (localStorage.getItem("dev:role") as any) || "owner";
      const k = localStorage.getItem("dev:key") || "";
      setOn(cur);
      setRole(r);
      setKey(k);
    } catch {
      /* no-op */
    }
  }, []);

  // persist helpers
  function persist(nextOn: boolean, nextRole: string, nextKey: string) {
    try {
      localStorage.setItem("dev:testmode", nextOn ? "on" : "off");
      localStorage.setItem("dev:role", nextRole);
      localStorage.setItem("dev:key", nextKey);

      // lightweight cookies (SSR/middleware readable)
      const base = "Path=/; SameSite=Lax";
      document.cookie = `dev_key=${encodeURIComponent(nextKey)}; ${base}`;
      document.cookie = `dev_role=${encodeURIComponent(nextRole)}; ${base}`;
      document.cookie = `dev_testmode=${nextOn ? "on" : "off"}; ${base}`;
    } catch {
      /* no-op */
    }
  }

  async function handleKeySubmit() {
  const k = inputKey.trim();
  if (!k) return;

  try {
    const res = await fetch("/api/developer/session/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: k }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data?.error || `Dev login failed (HTTP ${res.status})`);
      return;
    }

    // ✅ Turn test mode ON + store role + key + cookies
    persist(true, role, k);
    setErr(null);
    setKey(k);
    setOn(true);
    setInputKey("");

    // 🔥 Hard reload the current page with dev cookies now applied
    // This guarantees all server components / API routes see dev-testmode
    window.location.reload();
  } catch (e: any) {
    setErr(e?.message || "Dev login failed");
  }
}

  async function toggleOnOff(nextOn: boolean) {
    if (nextOn && !String(key).trim()) {
      setErr("Enter your dev key, press OK, then toggle ON.");
      return;
    }
    setErr(null);
    persist(nextOn, role, key);
    setOn(nextOn);
    router.refresh();
  }

  async function resetAll() {
    try {
      await fetch("/api/developer/session/end", {
        method: "POST",
        cache: "no-store",
      });
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem("dev:testmode");
      localStorage.removeItem("dev:role");
      localStorage.removeItem("dev:key");

      const expire = "Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/";
      document.cookie = `dev_testmode=; ${expire}`;
      document.cookie = `dev_role=; ${expire}`;
      document.cookie = `dev_key=; ${expire}`;
    } catch {
      /* no-op */
    }
    setOn(false);
    setKey("");
    setRole("owner");
    setErr(null);
    router.refresh();
  }

  if (!ENABLED) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-xl border border-white/15 bg-white/10 p-3 text-xs text-white shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <label className="font-semibold opacity-80">Test Mode</label>
        <button
          className={`rounded px-2 py-1 ${
            on ? "bg-white text-black" : "bg-white/20"
          }`}
          onClick={() => toggleOnOff(!on)}
        >
          {on ? "ON" : "OFF"}
        </button>
      </div>

      <div className="grid gap-2">
        {/* Role & key controls stay the same */}
        <div className="flex items-center gap-2">
          <label className="w-16 opacity-75">Role</label>
          <select
            className="flex-1 rounded bg-white/10 px-2 py-1"
            value={role}
            onChange={(e) => {
              const next = e.target.value as "owner" | "staff" | "customer";
              setRole(next);
              persist(true, next, key || "");
              setOn(true);
              router.refresh();
            }}
          >
            <option value="owner">owner</option>
            <option value="staff">staff</option>
            <option value="customer">customer</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="w-16 opacity-75">Dev Key</label>
          <input
            className="flex-1 rounded bg-white/10 px-2 py-1"
            value={inputKey}
            placeholder={key ? "••••••••••••" : "Enter key"}
            onChange={(e) => setInputKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleKeySubmit()}
          />
          <button
            className="rounded bg-white px-2 py-1 font-semibold text-black"
            onClick={handleKeySubmit}
          >
            OK
          </button>
        </div>

        {/* 🔹 Updated navigation to match RewardCircle / NeonHQ */}
        <div className="mt-2 flex flex-wrap justify-between gap-2">
          {/* Global */}
          <button
            onClick={() => router.push("/")}
            className="rounded border border-white/30 px-2 py-1 hover:bg-white hover:text-black"
          >
            Home
          </button>

          <button
            onClick={() => router.push("/dev")}
            className="rounded border border-blue-400/30 px-2 py-1 hover:bg-blue-400 hover:text-black"
          >
            Dev Console
          </button>

          {/* Org-level */}
          <button
            onClick={() => router.push(`/orgs/${orgId}`)}
            className="rounded border border-blue-400/30 px-2 py-1 hover:bg-blue-400 hover:text-black"
          >
            Org Dashboard
          </button>

          <button
            onClick={() => router.push(`/orgs/${orgId}/loyalty`)}
            className="rounded border border-blue-400/30 px-2 py-1 hover:bg-blue-400 hover:text-black"
          >
            Loyalty Hub
          </button>

          {/* Staff flows */}
          <button
            onClick={() =>
              router.push(`/orgs/${orgId}/loyalty/staff/earn`)
            }
            className="rounded border border-emerald-400/40 px-2 py-1 hover:bg-emerald-400 hover:text-black"
          >
            Staff · Earn
          </button>

          <button
            onClick={() =>
              router.push(`/orgs/${orgId}/loyalty/staff/redeem`)
            }
            className="rounded border border-emerald-400/40 px-2 py-1 hover:bg-emerald-400 hover:text-black"
          >
            Staff · Redeem
          </button>

          {/* Customer-facing wallet */}
          <button
            onClick={() =>
              router.push(`/orgs/${orgId}/loyalty/customer`)
            }
            className="rounded border border-purple-400/40 px-2 py-1 hover:bg-purple-400 hover:text-black"
          >
            Customer Wallet
          </button>

          {/* Reset */}
          <button
            onClick={resetAll}
            className="rounded border border-red-500/30 px-2 py-1 hover:bg-red-500 hover:text-black"
          >
            Reset
          </button>
        </div>

        {err && <p className="mt-2 text-[11px] text-red-400">{err}</p>}

        <p className="mt-2 text-[10px] opacity-60">
          Uses <code>/api/developer/session/start</code> to set HttpOnly{" "}
          <code>devpass</code>. Enter your dev key → OK → toggle ON. Role
          changes call <code>router.refresh()</code>.
        </p>
      </div>
    </div>
  );
}