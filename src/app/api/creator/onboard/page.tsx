"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

type CreatorProfile = {
  email: string;
  displayName: string;
  handle: string | null;
  payoutShare: number;
  status: "ACTIVE" | "DISABLED";
};

export default function CreatorOnboardPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [checking, setChecking] = useState(false);
  const [existing, setExisting] = useState<CreatorProfile | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [agree, setAgree] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const creatorShare = 45;

  // Load logged-in user
  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const email = data?.user?.email ?? null;
        setUserEmail(email);
      } catch (e) {
        console.error("[creator/onboard] getUser error", e);
        setUserEmail(null);
      } finally {
        setLoadingUser(false);
      }
    };
    run();
  }, []);

  // If not logged in, send to login and return here
  useEffect(() => {
    if (loadingUser) return;
    if (!userEmail) {
      router.push(`/login?redirectTo=${encodeURIComponent("/creator/onboard")}`);
      return;
    }
  }, [loadingUser, userEmail, router]);

  // Check if already a creator
  useEffect(() => {
    if (!userEmail) return;

    const check = async () => {
      setChecking(true);
      try {
        const res = await fetch(`/api/creator/me?email=${encodeURIComponent(userEmail)}`);
        const json = await res.json();
        if (res.ok && json?.profile?.status === "ACTIVE") {
          setExisting(json.profile);
          // If already active, take them straight to go-live (room = email for now)
          router.push(`/live/${encodeURIComponent(userEmail)}`);
        }
      } catch (e) {
        console.error("[creator/onboard] check creator error", e);
      } finally {
        setChecking(false);
      }
    };

    check();
  }, [userEmail, router]);

  const handleSubmit = async () => {
    setError(null);

    if (!userEmail) {
      setError("You must be signed in.");
      return;
    }

    if (!displayName.trim()) {
      setError("Please enter your creator name.");
      return;
    }

    if (!agree) {
      setError("Please confirm you agree to the creator terms.");
      return;
    }

    try {
      setBusy(true);

      const res = await fetch("/api/creator/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          displayName: displayName.trim(),
          handle: handle.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Could not activate creator account.");
        return;
      }

      // Auto-approved → send directly to live
      router.push(`/live/${encodeURIComponent(userEmail)}`);
    } catch (e) {
      console.error("[creator/onboard] activate error", e);
      setError("Could not activate creator account. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const subtitle = useMemo(() => {
    return `Creators earn ${creatorShare}% on all Tips, Boosts and Spins.`;
  }, []);

  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/40">
        <div className="text-center">
          <div className="text-xl font-semibold tracking-tight">Become a Creator</div>
          <div className="text-[11px] text-white/55 mt-2">{subtitle}</div>
        </div>

        {(checking || busy) && (
          <div className="mt-4 text-[11px] text-white/45 text-center">
            Setting things up…
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-white/70">Creator name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3 text-sm"
              placeholder="e.g. Westley"
              disabled={busy}
            />
          </div>

          <div>
            <label className="text-xs text-white/70">Handle (optional)</label>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3 text-sm"
              placeholder="e.g. revolvrwest"
              disabled={busy}
            />
            <div className="text-[11px] text-white/45 mt-2">
              This can be added later. Keep it simple for launch.
            </div>
          </div>

          <label className="flex items-start gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              disabled={busy}
              className="mt-1"
            />
            <span>
              I confirm I am authorised to create and monetise content on Revolvr, and I agree to
              the creator terms. (Auto-approved on submit.)
            </span>
          </label>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-semibold py-3"
          >
            {busy ? "Activating…" : "Activate Creator Account"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/public-feed")}
            className="w-full text-[11px] text-white/50 hover:text-white/70"
          >
            Not now — take me to the feed
          </button>
        </div>
      </div>
    </div>
  );
}
