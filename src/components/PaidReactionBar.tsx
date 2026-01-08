// src/components/PaidReactionBar.tsx
"use client";

import { useEffect, useState } from "react";

const REACTIONS = ["🔥", "❤️", "👏", "😂", "😮"] as const;
export type PaidReaction = (typeof REACTIONS)[number];

type Counts = Record<PaidReaction, number>;

type CountsResponse = {
  counts?: Partial<Record<string, number>>; // server may return keys as strings
  error?: string;
};

type PostResponse = { success?: boolean; error?: string };

export function PaidReactionBar({
  postId,
  viewerEmail,
  initialCounts,
  disabled,
  onSuccess,
}: {
  postId: string;
  viewerEmail: string;
  initialCounts?: Partial<Record<PaidReaction, number>>;
  disabled?: boolean;
  onSuccess?: () => void;
}) {
  const [counts, setCounts] = useState<Counts>(() => ({
    "🔥": initialCounts?.["🔥"] ?? 0,
    "❤️": initialCounts?.["❤️"] ?? 0,
    "👏": initialCounts?.["👏"] ?? 0,
    "😂": initialCounts?.["😂"] ?? 0,
    "😮": initialCounts?.["😮"] ?? 0,
  }));

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<PaidReaction | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (initialCounts) return;

      try {
        const res = await fetch(
          `/api/reactions/paid?postId=${encodeURIComponent(postId)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;

        const j = (await res.json().catch(() => null)) as CountsResponse | null;
        const c = j?.counts;
        if (!c || cancelled) return;

        setCounts({
          "🔥": Number(c["🔥"] ?? 0),
          "❤️": Number(c["❤️"] ?? 0),
          "👏": Number(c["👏"] ?? 0),
          "😂": Number(c["😂"] ?? 0),
          "😮": Number(c["😮"] ?? 0),
        });
      } catch {
        // ignore
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [postId, initialCounts]);

  async function send(reaction: PaidReaction) {
    if (disabled) return;
    if (busy) return;

    setError(null);
    setBusy(reaction);

    setCounts((prev) => ({ ...prev, [reaction]: prev[reaction] + 1 }));

    try {
      const res = await fetch("/api/reactions/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, reaction, viewerEmail }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as PostResponse;
        throw new Error(j.error ?? `Failed (${res.status})`);
      }

      onSuccess?.();
    } catch (e: unknown) {
      setCounts((prev) => ({
        ...prev,
        [reaction]: Math.max(0, prev[reaction] - 1),
      }));

      const msg = e instanceof Error ? e.message : "Failed";
      setError(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center gap-2 flex-wrap">
        {REACTIONS.map((r) => {
          const isThisBusy = busy === r;
          const isBtnDisabled = !!disabled || isThisBusy;

          return (
            <button
              key={r}
              type="button"
              disabled={isBtnDisabled}
              onClick={() => send(r)}
              className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-sm disabled:opacity-50"
              title="Paid reaction (spends 1 tip credit)"
              aria-label={`Send paid reaction ${r}`}
            >
              <span className="mr-1">{r}</span>
              <span className="tabular-nums text-white/80">
                {counts[r]}
                {isThisBusy ? "…" : ""}
              </span>
            </button>
          );
        })}
      </div>

      {error ? <div className="mt-2 text-xs text-red-300">{error}</div> : null}
    </div>
  );
}
