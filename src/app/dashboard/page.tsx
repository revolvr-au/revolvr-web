"use client";

import React, { useEffect, useState } from "react";

type RevolvrItem = {
  id: string;
  name: string;
  createdAt: string;
};

const DashboardPage: React.FC = () => {
  const [items, setItems] = useState<RevolvrItem[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load items on first render
  useEffect(() => {
    const load = async () => {
      try {
        setError(null);

        const res = await fetch("/api/items");
        const body = await res.json().catch(() => null);

        if (!res.ok) {
          console.error("GET /api/items error:", body);
          const msg =
            body && typeof body.message === "string"
              ? body.message
              : "Failed to load items.";
          setError(msg);
        } else {
          setItems(body as RevolvrItem[]);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
        setError("Could not load items. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      setCreating(true);
      setError(null);

      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("POST /api/items error:", body);
        const msg =
          body && typeof body.message === "string"
            ? body.message
            : "Failed to create item.";
        setError(msg);
        return;
      }

      setItems((prev) => [body as RevolvrItem, ...prev]);
      setName("");
    } catch (err) {
      console.error("Create error:", err);
      setError("Could not create item. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Revolvr Dashboard</h1>
        <span className="text-xs text-slate-400">
          v0.2 · Backed by Supabase · Prisma
        </span>
      </header>

      <section className="grid gap-6 md:grid-cols-[2fr,3fr]">
        {/* Left: create panel */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              First action
            </p>
            <p className="text-sm text-slate-200">
              Create a “Revolvr item”. This is saved inside your Supabase
              database via Prisma.
            </p>
          </div>

          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name your Revolvr item…"
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />

            <button
              onClick={handleCreate}
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              disabled={!name.trim() || creating}
            >
              {creating ? "Adding…" : "Add item"}
            </button>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
          </div>
        </div>

        {/* Right: list panel */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-3">
            Your items
          </p>

          {loading ? (
            <p className="text-sm text-slate-400">Loading items…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nothing here yet. Add your first item on the left.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
                >
                  <span>{item.name}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
};

export default DashboardPage;
