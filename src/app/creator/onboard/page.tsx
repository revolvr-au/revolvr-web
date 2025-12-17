"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

const normalizeHandle = (s: string) => s.trim().toLowerCase().replace(/^@/, "");
const isValidHandle = (s: string) => /^[a-z0-9_]{3,20}$/.test(s);

export default function CreatorOnboardPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");

  const hNormalized = useMemo(() => normalizeHandle(handle), [handle]);

  // HARD GUARD: never allow this page to run without a session
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        if (!data.session) {
          router.replace(`/login?redirectTo=${encodeURIComponent("/creator/onboard")}`);
          return;
        }

        setReady(true);
      } catch (e) {
        router.replace(`/login?redirectTo=${encodeURIComponent("/creator/onboard")}`);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [router]);

  const activateCreator = async () => {
    setError(null);

    if (!agree) return setError("You must accept the creator terms to continue.");

    const dn = displayName.trim();
    const h = normalizeHandle(handle);

    if (!dn) return setError("Please enter a display name.");
    if (!h) return setError("Please choose a handle.");
    if (!isValidHandle(h)) return setError("Handle must be 3–20 chars: a–z, 0–9, underscore.");

    try {
      setLoading(true);

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const user = authData.user;
      if (!user?.id || !user?.email) {
        router.replace(`/login?redirectTo=${encodeURIComponent("/creator/onboard")}`);
        return;
      }

      const email = user.email.toLowerCase().trim();

      const { error: upsertErr } = await supabase.from("creator_profiles").upsert({
        user_id: user.id,
        email,
        status: "ACTIVE",
        revenue_share: 0.45,
        display_name: dn,
        handle: h,
        // avatar_url: null, // later
      });

      if (upsertErr) throw upsertErr;

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

  if (!ready) {
    return <div className="min-h-screen p-6 text-white">Checking session…</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050814] text-white p-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold text-center">Become a Creator on Revolvr</h1>

        <p className="text-sm text-white/70 mt-4 text-center">
          Creators earn <strong>45%</strong> on all tips, boosts, and spins.
        </p>

        {error && <div className="mt-4 text-sm text-red-400 text-center">{error}</div>}

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-white/70">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3 text-sm"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="text-xs text-white/70">Handle</label>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3 text-sm"
              placeholder="@westley"
            />
            <div className="mt-2 text-[11px] text-white/50">
              3–20 chars: a–z, 0–9, underscore. “@” is optional.
              {hNormalized && (
                <>
                  {" "}
                  Your handle: <span className="text-white/70">@{hNormalized}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <label className="mt-6 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
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
