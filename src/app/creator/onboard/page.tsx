"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export default function CreatorOnboardPage() {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activateCreator = async () => {
    if (!agree) {
      setError("You must accept the creator terms to continue.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        data: { is_creator: true },
      });

      if (error) throw error;

      router.replace("/creator");
    } catch (e) {
      console.error(e);
      setError("Failed to activate creator account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050814] text-white p-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold text-center">
          Become a Creator on Revolvr
        </h1>

        <p className="text-sm text-white/70 mt-4 text-center">
          Creators earn <strong>45%</strong> on all tips, boosts, and spins —
          across live broadcasts and the public feed.
        </p>

        {error && (
          <div className="mt-4 text-sm text-red-400 text-center">{error}</div>
        )}

        <label className="mt-6 flex items-center gap-2 text-sm">
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
          className="mt-6 w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-semibold py-3"
        >
          {loading ? "Activating…" : "Activate Creator Account"}
        </button>
      </div>
    </div>
  );
}
