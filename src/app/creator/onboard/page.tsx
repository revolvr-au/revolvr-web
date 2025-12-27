"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

const supabase = createSupabaseBrowserClient();

export default function CreatorOnboardPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onActivate = async () => {
    setErr(null);
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setErr("unauthenticated");
        return;
      }

      const res = await fetch("/api/creator/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          handle: handle.trim(),
          displayName: displayName.trim(),
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error || "Server error");
        return;
      }

      router.push("/creator/dashboard");
    } catch (e) {
      console.error("[creator/onboard] activate error", e);
      setErr("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-semibold">Creator onboarding</h1>
      <p className="mt-2 text-sm text-white/70">
        Set your creator handle to activate your creator account.
      </p>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Handle</label>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none"
            placeholder="your-handle"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Display name (optional)</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none"
            placeholder="Your name"
          />
        </div>

        {err && (
          <pre className="text-xs rounded-xl bg-red-500/10 border border-red-400/20 text-red-200 px-3 py-2 whitespace-pre-wrap">
            {JSON.stringify({ error: err })}
          </pre>
        )}

        <button
          type="button"
          onClick={onActivate}
          disabled={loading}
          className="w-full rounded-xl bg-black text-white px-4 py-3 font-semibold disabled:opacity-60"
        >
          {loading ? "Activating…" : "Activate creator"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 font-semibold"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}
