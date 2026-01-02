"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getOrgId } from "@/lib/org";

type RewardRow = {
  id: string;
  name: string;
  description?: string;
  pointsCost: number;
  active: boolean;
  sortOrder?: number;
};

export default function LoyaltyAdminRewardsPage() {
  // 🔥 Always read orgId from env (Neon Lunchbox)
  const orgId = getOrgId();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [rewards, setRewards] = useState<RewardRow[]>([]);

  // form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [costInput, setCostInput] = useState<string>("0");
  const [sortInput, setSortInput] = useState<string>("0");
  const [activeInput, setActiveInput] = useState(true);

  // Load rewards from API
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/orgs/${orgId}/loyalty/admin/rewards`,
          { cache: "no-store" }
        );

        const data = await res.json().catch(() => ({}));
        if (!alive) return;

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load rewards.");
        }

        const list: RewardRow[] = (data.rewards || []).map((r: any) => ({
          id: r.id,
          name: r.name ?? "Reward",
          description: r.description ?? "",
          pointsCost: typeof r.pointsCost === "number" ? r.pointsCost : 0,
          active: r.active !== false,
          sortOrder:
            typeof r.sortOrder === "number" ? r.sortOrder : undefined,
        }));

        setRewards(list);
      } catch (e: any) {
        console.error("[LoyaltyAdminRewards] load error:", e);
        if (!alive) return;
        setError(e?.message || "Failed to load rewards.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [orgId]);

  function startCreateNew() {
    setEditingId(null);
    setNameInput("");
    setDescInput("");
    setCostInput("0");
    setSortInput(
      String((rewards[rewards.length - 1]?.sortOrder ?? 0) + 10)
    );
    setActiveInput(true);
    setSuccess(null);
    setError(null);
  }

  function startEdit(reward: RewardRow) {
    setEditingId(reward.id);
    setNameInput(reward.name);
    setDescInput(reward.description ?? "");
    setCostInput(String(reward.pointsCost ?? 0));
    setSortInput(String(reward.sortOrder ?? 0));
    setActiveInput(reward.active);
    setSuccess(null);
    setError(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setError("Reward name is required.");
      return;
    }

    const cost = Number(costInput);
    if (isNaN(cost) || cost <= 0) {
      setError("Points cost must be a positive number.");
      return;
    }

    const sortOrder = Number(sortInput) || 0;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        id: editingId ?? undefined,
        name: trimmedName,
        description: descInput.trim() || "",
        pointsCost: cost,
        sortOrder,
        active: activeInput,
      };

      const res = await fetch(
        `/api/orgs/${orgId}/loyalty/admin/rewards`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save reward.");
      }

      if (editingId) {
        // Update local state
        setRewards((prev) =>
          prev
            .map((r) =>
              r.id === editingId
                ? {
                    ...r,
                    name: trimmedName,
                    description: descInput.trim() || "",
                    pointsCost: cost,
                    sortOrder,
                    active: activeInput,
                  }
                : r
            )
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        );
        setSuccess("Reward updated.");
      } else {
        const newReward: RewardRow =
          data.reward || payload || ({} as any);
        setRewards((prev) =>
          [...prev, newReward].sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
          )
        );
        setSuccess("Reward created.");
      }
    } catch (e: any) {
      console.error("[LoyaltyAdminRewards] save error:", e);
      setError(e?.message || "Failed to save reward.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(reward: RewardRow) {
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `/api/orgs/${orgId}/loyalty/admin/rewards`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: reward.id,
            active: !reward.active,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update reward.");
      }

      setRewards((prev) =>
        prev.map((r) =>
          r.id === reward.id ? { ...r, active: !r.active } : r
        )
      );
      setSuccess(
        !reward.active ? "Reward unarchived." : "Reward archived."
      );
    } catch (e: any) {
      console.error("[LoyaltyAdminRewards] toggle active error:", e);
      setError(e?.message || "Failed to update reward.");
    }
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-400/80">
            NeonHQ · RewardCircle
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">Rewards</h1>
          <p className="text-sm text-slate-400">
            Configure the reward store your customers and staff see.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              router.push(`/orgs/${orgId}/loyalty/admin`)
            }
            className="rounded-md border border-slate-600 px-3 py-1.5 text-xs hover:bg-white hover:text-black"
          >
            Back to dashboard
          </button>

          <button
            type="button"
            onClick={startCreateNew}
            className="rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          >
            New reward
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {success}
        </div>
      )}

      {/* Layout */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Rewards table */}
        <div className="space-y-2">
          <div className="text-xs text-slate-400">
            {loading
              ? "Loading rewards…"
              : `Showing ${rewards.length} reward${
                  rewards.length === 1 ? "" : "s"
                }`}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/80 text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Cost</th>
                  <th className="px-3 py-2 text-left font-medium">Sort</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {rewards.map((r) => (
                  <tr key={r.id} className="border-t border-slate-800/80">
                    <td className="px-3 py-2">
                      <div className="text-slate-100 font-medium">
                        {r.name}
                      </div>
                      {r.description && (
                        <div className="text-[11px] text-slate-400">
                          {r.description}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2">{r.pointsCost}</td>
                    <td className="px-3 py-2">{r.sortOrder ?? "—"}</td>

                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          r.active
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-700/40 text-slate-300 border border-slate-600"
                        }`}
                      >
                        {r.active ? "Active" : "Archived"}
                      </span>
                    </td>

                    <td className="px-3 py-2 space-x-2">
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleActive(r)}
                        className="text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        {r.active ? "Archive" : "Unarchive"}
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && rewards.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-xs text-slate-400"
                    >
                      No rewards configured yet. Click “New reward” to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Editor form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">
              {editingId ? "Edit reward" : "New reward"}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={startCreateNew}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >
                Clear form
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                Name
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                Description (optional)
              </label>
              <textarea
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                rows={3}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Points cost
                </label>
                <input
                  type="number"
                  min="1"
                  value={costInput}
                  onChange={(e) => setCostInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Sort order
                </label>
                <input
                  type="number"
                  value={sortInput}
                  onChange={(e) => setSortInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={activeInput}
                onChange={(e) => setActiveInput(e.target.checked)}
              />
              Reward is active (visible to staff & customers)
            </label>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving
                  ? editingId
                    ? "Saving…"
                    : "Creating…"
                  : editingId
                  ? "Save changes"
                  : "Create reward"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
