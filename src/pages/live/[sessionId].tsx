// src/pages/live/[sessionId].tsx

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { supabase } from "@/lib/supabaseClients";

type SessionStatus = "loading" | "live" | "ended" | "error";

type ViewerResponse = {
  token: string;
  livekitUrl: string;
  title?: string | null;
  hostIdentity?: string;
  status?: "live" | "ended";
};

type PurchaseMode = "tip" | "boost" | "spin";

export default function ViewerPage() {
  const router = useRouter();
  const { sessionId } = router.query;

  const [status, setStatus] = useState<SessionStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [viewerToken, setViewerToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [streamTitle, setStreamTitle] = useState<string>("Watching stream");

  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [likes, setLikes] = useState(0);
  const [likePulse, setLikePulse] = useState(false);

  // Load logged-in user (for payments)
  useEffect(() => {
    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUserEmail(user?.email ?? null);
      } catch (err) {
        console.error("[viewer] error loading user", err);
      }
    };

    loadUser();
  }, []);

  // Fetch viewer token + stream state
  useEffect(() => {
    if (!router.isReady) return;
    if (typeof sessionId !== "string") return;

    let cancelled = false;

    const load = async () => {
      try {
        setStatus("loading");
        setErrorMessage(null);

        const res = await fetch(
          `/api/live/${encodeURIComponent(sessionId)}/viewer`
        );

        if (!res.ok) {
          if (res.status === 410) {
            // Stream ended
            if (!cancelled) setStatus("ended");
            return;
          }

          const body = await res.text();
          throw new Error(
            `[viewer] API ${res.status} ${res.statusText}: ${body}`
          );
        }

        const data = (await res.json()) as ViewerResponse;

        if (cancelled) return;

        if (!data.token || !data.livekitUrl) {
          throw new Error("Missing token or LiveKit URL in viewer response");
        }

        setViewerToken(data.token);
        setLivekitUrl(data.livekitUrl);
        setStreamTitle(data.title || "Watching stream");
        setStatus("live");
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setErrorMessage("Revolvr glitched joining this stream 😵‍💫");
        setStatus("error");
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, sessionId]);

  const safeSessionId = useMemo(
    () => (typeof sessionId === "string" ? sessionId : null),
    [sessionId]
  );

  // Redirect to login if not logged in
  const ensureLoggedIn = () => {
    if (!userEmail) {
      if (safeSessionId) {
        const redirect = encodeURIComponent(`/live/${safeSessionId}`);
        router.push(`/login?redirectTo=${redirect}`);
      } else {
        router.push("/login");
      }
      return false;
    }
    return true;
  };

  // Helpers for payment amounts
  const singleAmountForMode = (mode: PurchaseMode) => {
    switch (mode) {
      case "tip":
        return 200; // A$2
      case "boost":
        return 500; // A$5
      case "spin":
      default:
        return 100; // A$1
    }
  };

  const startPayment = async (mode: PurchaseMode) => {
    if (!ensureLoggedIn()) return;
    if (!userEmail || !safeSessionId) return;

    try {
      setErrorMessage(null);

      const amountCents = singleAmountForMode(mode);

      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          userEmail,
          amountCents,
          // Re-use postId for live sessions so backend & Stripe stay the same
          postId: `live:${safeSessionId}`,
        }),
      });

      if (!res.ok) {
        console.error(
          "[viewer] checkout failed:",
          res.status,
          await res.text()
        );
        setErrorMessage(
          "Revolvr glitched out starting checkout 😵‍💫 Try again."
        );
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage("Stripe did not return a checkout URL.");
      }
    } catch (err) {
      console.error("[viewer] error starting payment", err);
      setErrorMessage("Revolvr glitched out talking to Stripe 😵‍💫");
    }
  };

  // Local like button pulse
  const handleLike = () => {
    setLikes((x) => x + 1);
    setLikePulse(true);
    setTimeout(() => setLikePulse(false), 220);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!safeSessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-sm text-white/70">
          Invalid stream link.{" "}
          <Link href="/public-feed" className="underline">
            Back to Revolvr
          </Link>
        </p>
      </div>
    );
  }

  // Ended / error states
  if (status === "ended") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-4">
        <h1 className="text-xl font-semibold mb-2">Stream has ended</h1>
        <p className="text-sm text-white/60 mb-4">
          This Revolvr stream is over, but the chaos never sleeps.
        </p>
        <Link
          href="/public-feed"
          className="px-4 py-2 rounded-full bg-emerald-500 text-black text-sm font-medium"
        >
          Back to public feed
        </Link>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-4">
        <h1 className="text-xl font-semibold mb-2">Couldn&apos;t join</h1>
        {errorMessage && (
          <p className="text-sm text-white/60 mb-3 text-center max-w-sm">
            {errorMessage}
          </p>
        )}
        <button
          onClick={() => router.reload()}
          className="px-4 py-2 rounded-full bg-white text-black text-sm font-medium mb-2"
        >
          Try again
        </button>
        <Link
          href="/public-feed"
          className="text-xs text-white/50 hover:text-white/80 underline"
        >
          Back to public feed
        </Link>
      </div>
    );
  }

  // Loading state
  if (status === "loading" || !viewerToken || !livekitUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <p className="text-sm text-white/60 mb-2">
          Joining Revolvr stream…
        </p>
        <div className="h-6 w-6 rounded-full border-2 border-white/30 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Live stream!
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-black via-black/80 to-black">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-red-400 tracking-[0.12em] uppercase">
              Live
            </span>
            <span className="text-sm font-medium truncate max-w-[260px] sm:max-w-[420px]">
              {streamTitle}
            </span>
          </div>
        </div>

        <Link
          href="/public-feed"
          className="text-[11px] text-white/55 hover:text-white/90 underline"
        >
          Back to feed
        </Link>
      </header>

      {/* Video area */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 bg-black">
          <LiveKitRoom
            token={viewerToken}
            serverUrl={livekitUrl}
            connect={true}
            video={true}
            audio={true}
            data-lk-theme="default"
          >
            <VideoConference />
          </LiveKitRoom>
        </div>

        {/* Support bar */}
        <div className="border-t border-white/10 bg-black/90 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span>Show some love for this stream:</span>
            <button
              type="button"
              onClick={handleLike}
              className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full border border-pink-400/60 text-pink-200 text-xs bg-pink-500/15 hover:bg-pink-500/25 transition-transform ${
                likePulse ? "scale-110" : ""
              }`}
            >
              ❤️ <span className="ml-1 text-[11px]">{likes}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
            <button
              type="button"
              onClick={() => startPayment("tip")}
              className="px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/60 text-[11px] font-medium text-emerald-200 transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              Tip A$2
            </button>
            <button
              type="button"
              onClick={() => startPayment("boost")}
              className="px-3 py-1.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/60 text-[11px] font-medium text-indigo-200 transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              Boost A$5
            </button>
            <button
              type="button"
              onClick={() => startPayment("spin")}
              className="px-3 py-1.5 rounded-full bg-pink-500/10 hover:bg-pink-500/20 border border-pink-400/60 text-[11px] font-medium text-pink-200 transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              Spin A$1
            </button>
          </div>
        </div>

        {/* Error banner (non-blocking) */}
        {errorMessage && (
          <div className="px-4 pb-3">
            <div className="mt-2 rounded-xl bg-red-500/10 text-red-200 text-xs px-3 py-2 flex justify-between items-center">
              <span>{errorMessage}</span>
              <button
                className="text-[10px] underline"
                onClick={() => setErrorMessage(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
