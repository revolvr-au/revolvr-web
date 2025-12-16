"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

const normalizeHandle = (s: string) =>
  s.trim().toLowerCase().replace(/^@/, "");

const isValidHandle = (s: string) =>
  /^[a-z0-9_]{3,20}$/.test(s);

export default function CreatorOnboardPage() {
  const router = useRouter();

  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");

  const activateCreator = async () => {
    setError(null);

    if (!agree) {
      setError("You must accept the creator terms to continue.");
      return;
    }

    const dn = displayName.trim();
    const h = normalizeHandle(handle);

    if (!dn) {
      setError("Please enter a display name.");
      return;
    }

    if (!h) {
      setError("Please choose a handle.");
      return;
    }

    if (!isValidHandle(h)) {
      setError("Handle must be 3–20 characters (a–z, 0–9, underscore).");
      return;
    }

    try {
      setLoading(true);

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const user = authData.user;
      if (!user?.id || !user?.email) {
        router.replace(`/login?redirectTo=${encodeURIComponent("/creator/onboard")}`);
        return;
      }

      const { error: upsertErr } = await supabase
        .from("creator_profiles")
        .upsert({
          user_id: user.id,
          email: user.email.toLowerCase().trim(),
          status: "ACTIVE",
          revenue_share: 0.45,
          display_name: dn,
          handle: h,
          // avatar_url: null
        });

      if (upsertErr) {
        // unique handle collision will land here
        if (upsertErr.code === "23505") {
          setError("That handle is already taken.");
          return;
        }
        throw upsertErr;
      }

      const { error: metaErr } = await supabase.auth.updateUser({
        data: { is_creator: true },
      });

      if (metaErr) throw metaErr;

      router.replace("/creator");
    } catch (e) {
      console.error("[creator/onboard] activate error", e);
      setError("Failed to activate creator account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050814] text-white p-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center">
          Become a Creator on Revolvr
        </h1>

        <p className="text-sm text-white/70 text-center">
          Creators earn <strong>45%</strong> on all tips, boosts, and spins.
        </p>

        {error && (
          <div className="text-sm text-red-400 text-center">{error}</div>
        )}

        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          className="w-full rounded-lg bg-black/30 border border-white/15 px-3 py-2"
        />

        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@handle"
          className="w-full rounded-lg bg-black/30 border border-white/15 px-3 py-2"
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          I agree to the creator terms and revenue share.
        </label>

        <button
          onClick={activateCreator}
          disabled={loading}
          className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-semibold py-3"
        >
          {loading ? "Activating…" : "Activate Creator Account"}
        </button>
      </div>
    </div>
  );
}
