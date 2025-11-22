"use client";

import { useState } from "react";

type RevolvrItem = {
  id: number;
  name: string;
  createdAt: string;
};

export default function DashboardPage() {
  const [items, setItems] = useState<RevolvrItem[]>([]);
  const [name, setName] = useState("");

  function handleCreate() {
    if (!name.trim()) return;

    const newItem: RevolvrItem = {
      id: Date.now(),
      name: name.trim(),
      createdAt: new Date().toLocaleString(),
    };

    setItems((prev) => [newItem, ...prev]);
    setName("");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Revolvr Dashboard</h1>
        <span className="text-xs text-slate-400">
          v0.1 · Foundations only · No backend yet
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
              Create a test “Revolvr item”. Later this becomes your real object
              (client, project, listing, whatever Revolvr is about).
            </p>
          </div>

          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name your first Revolvr item…"
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />

            <button
              onClick={handleCreate}
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              disabled={!name.trim()}
            >
              Add item
            </button>
          </div>
        </div>

        {/* Right: list panel */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-3">
            Your items
          </p>

          {items.length === 0 ? (
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
                    {item.createdAt}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
