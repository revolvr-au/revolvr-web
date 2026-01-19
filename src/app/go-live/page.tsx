"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

type CreateLiveResponse =
  | { sessionId?: string; id?: string; room?: string; roomId?: string }
  | any;

export default function GoLivePage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loginHref = useMemo(() => "/login?redirectTo=/go-live", []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const u = data?.user ?? null;

        if (cancelled) return;

        setEmail(u?.email ?? null);
        setIsCreator(Boolean(u?.user_metadata?.is_creator));
      } catch (e) {
        if (cancelled) return;
        setEmail(null);
        setIsCreator(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function startBroadcast() {
    if (!email) {
      router.push(loginHref);
      return;
    }
    if (!isCreator) {
      router.push("/creator/onboard");
      return;
    }

    setBusy(true);
    setErr(null);

    try {
      const res = await fetch("/api/live/create", { method: "POST" });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Failed to create live session");
      }

      const json = (await res.json().catch(() => ({}))) as CreateLiveResponse;
      const sessionId =
        json?.sessionId || json?.id || json?.roomId || json?.room;

      if (!sessionId) throw new Error("Create live did not return a session id");

      router.push(
        `/live/${encodeURIComponent(String(sessionId))}?creator=${encodeURIComponent(
          email.toLowerCase()
        )}`
      );
    } catch (e: any) {
      setErr(String(e?.message || e || "Failed to start broadcast"));
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen w-full bg-[#05070C] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-black/30 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur">
        <h1 className="text-2xl font-semibold">Go Live</h1>
        <p className="mt-2 text-white/70">
          {email ? (
            <>
              Signed in as <span className="text-white/90">{email}</span>
            </>
          ) : (
            "Sign in to start a live session."
          )}
        </p>

        {err ? (
          <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          {!email ? (
            <Link
              href={loginHref}
              className="rounded-xl bg-emerald-400 px-5 py-3 text-center font-medium text-black hover:bg-emerald-300"
            >
              Sign in to go live
            </Link>
          ) : (
            <button
              onClick={startBroadcast}
              disabled={busy}
              className="rounded-xl bg-emerald-400 px-5 py-3 text-center font-medium text-black hover:bg-emerald-300 disabled:opacity-60"
            >
              {busy ? "Starting broadcast…" : "Start broadcast"}
            </button>
          )}

          <Link
            href="/public-feed"
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-center font-medium text-white/90 hover:bg-white/10"
          >
            Back to feed
          </Link>
        </div>

        {email && !isCreator ? (
          <p className="mt-4 text-xs text-white/50">
            Your account is not marked as a creator. You’ll be sent to onboarding.
          </p>
        ) : null}
      </div>
    </main>
  );
}
