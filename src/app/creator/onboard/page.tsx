"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

const normalizeHandle = (s: string) => s.trim().toLowerCase().replace(/^@/, "");
const isValidHandle = (s: string) => /^[a-z0-9_]{3,20}$/.test(s);

export default function CreatorOnboardPage() {
  const router = useRouter();

  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");

  // If you want: clear the old error as user types / checks box
  useEffect(() => {
    if (error) setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName, handle, agree]);

  const canSubmit = useMemo(() => {
    const dn = displayName.trim();
    const h = normalizeHandle(handle);
    return agree && dn.length > 0 && isValidHandle(h);
  }, [agree, displayName, handle]);

  const activateCreator = async () => {
    setError(null);

    const dn = displayName.trim();
    const h = normalizeHandle(handle);

    if (!agree) return setError("You must accept the creator terms to continue.");
    if (!dn) return setError("Please enter a display name.");
    if (!h) return setError("Please choose a handle.");
    if (!isValidHandle(h))
      return setError("Handle must be 3–20 chars: a–z, 0–9, underscore.");

    try {
      setLoading(true);

      // IMPORTANT: we are using getSession() here (not getUser()) so it
      // relies on the local persisted session. If session is missing, we send them to login.
      const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw sessErr;

      const session = sessionData.session;
      const user = session?.user;
      const email = user?.email?.toLowerCase().trim();

      if (!user?.id || !email) {
        router.replace(`/login?redirectTo=${encodeURIComponent("/creator/onboard")}`);
        return;
      }

      // Upsert profile (your DB columns in Supabase screenshot)
      const { error: upsertErr } = await supabase.from("creator_profiles").upsert({
        user_id: user.id,
        email,
        status: "ACTIVE",
        revenue_share: 0.45,
        display_name: dn,
        handle: h,
        // avatar_url: null, // add later if/when you create the column
      });

      if (upsertErr) throw upsertErr;

      // Optional: mark user metadata
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
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold text-center">Become a Creator on Revolvr</h1>

        <p className="text-sm text-white/70 mt-4 text-center">
          Creators earn <strong>45%</strong> on all tips, boosts, and spins.
        </p>

        {error && <div className="mt-4 text-sm text-red-400 text-center">{error}</div>}

        <div className="mt-6 space-y-3">
          <div>
            <label className="text-xs text-white/70">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3 text-sm"
              placeholder="Westley Buhagiar"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="text-xs text-white/70">Handle</label>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3 text-sm"
              placeholder="@westley"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className="mt-2 text-[11px] text-white/50">
              3–20 chars: a–z, 0–9, underscore. “@” is optional.
            </div>
          </div>
        </div>

        <label className="mt-6 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          I agree to the creator terms and revenue share.
        </label>

        <button
          onClick={activateCreator}
          disabled={loading || !canSubmit}
          className="mt-6 w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-semibold py-3"
        >
          {loading ? "Activating…" : "Activate Creator Account"}
        </button>
      </div>
    </div>
  );
}
