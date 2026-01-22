// src/app/live/[sessionId]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import LiveChatPanel from "@/components/live/LiveChatPanel";
import LiveChatOverlay from "@/components/live/LiveChatOverlay";

import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

import { supabase } from "@/lib/supabaseClients";
import type { CheckoutMode } from "@/lib/purchase";
import {
  CreditBalances,
  loadCreditsForUser,
  spendOneCredit,
  PurchaseMode,
} from "@/lib/credits";

type PendingPurchase = { mode: PurchaseMode };
type LiveMode = PurchaseMode | "reaction" | "vote";
type CheckoutResponse = { url?: string; error?: string };

export default function LiveRoomPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const safeSessionId = params?.sessionId ?? "";
  const sessionId = useMemo(
    () => decodeURIComponent(safeSessionId),
    [safeSessionId]
  );

  const role = searchParams?.get("role") || "";
  const isHost = role === "host";

  // ---- LiveKit creds (loaded from sessionStorage) ----
  const [lkUrl, setLkUrl] = useState<string>("");
  const [hostToken, setHostToken] = useState<string>("");
  const [viewerToken, setViewerToken] = useState<string>("");

  useEffect(() => {
    try {
      setLkUrl(sessionStorage.getItem("lk_url") ?? "");
      setHostToken(sessionStorage.getItem("lk_host_token") ?? "");
      setViewerToken(sessionStorage.getItem("lk_viewer_token") ?? "");
    } catch {
      // no-op
    }
  }, []);

  const activeToken = isHost ? hostToken : viewerToken;

  // Gate host join behind a user gesture for iOS reliability
  const [joined, setJoined] = useState<boolean>(() => !isHost);
  useEffect(() => setJoined(!isHost), [isHost]);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [credits, setCredits] = useState<CreditBalances | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);

  const [pendingPurchase, setPendingPurchase] =
    useState<PendingPurchase | null>(null);
  const [supportBusy, setSupportBusy] = useState(false);

  // Responsive helper
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ---- Live creator attribution ----
  const creatorEmail = useMemo(() => {
    const qs = searchParams?.get("creator")?.trim().toLowerCase() || "";
    const fallback = (process.env.NEXT_PUBLIC_DEFAULT_CREATOR_EMAIL || "")
      .trim()
      .toLowerCase();
    return qs || fallback || null;
  }, [searchParams]);

  const liveHrefForRedirect = useMemo(() => {
    const base = `/live/${encodeURIComponent(sessionId)}`;
    const qs = new URLSearchParams();
    if (creatorEmail) qs.set("creator", creatorEmail);
    if (isHost) qs.set("role", "host");
    const s = qs.toString();
    return s ? `${base}?${s}` : base;
  }, [sessionId, creatorEmail, isHost]);

  /* ---------------------- Load logged-in user ---------------------- */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUserEmail(user?.email ?? null);
      } catch (err) {
        console.error("[live] error loading user", err);
        setUserEmail(null);
      }
    };
    loadUser();
  }, []);

  /* ---------------------- Load credits for user -------------------- */
  useEffect(() => {
    if (!userEmail) {
      setCredits(null);
      return;
    }

    const fetchCredits = async () => {
      try {
        setCreditsLoading(true);
        const balances = await loadCreditsForUser(userEmail);
        setCredits(balances);
      } catch (err) {
        console.error("[live] error loading credits", err);
        setCredits({ tip: 0, boost: 0, spin: 0 });
      } finally {
        setCreditsLoading(false);
      }
    };

    fetchCredits();
  }, [userEmail, searchParams?.toString()]);

  /* ---------------------- Auth helper ------------------------------ */
  const ensureLoggedIn = () => {
    if (!userEmail) {
      setError("Not signed in. Click login below.");
      return false;
    }
    return true;
  };

  const ensureCreatorKnown = () => {
    if (!creatorEmail) {
      setError(
        "Missing creator identity for this live room. Add ?creator=EMAIL to the URL."
      );
      return false;
    }
    return true;
  };

  /* ---------------------- Stripe checkout -------------------------- */
  const startPayment = async (mode: LiveMode, kind: "single" | "pack") => {
    if (!ensureLoggedIn() || !userEmail) return;
    if (!ensureCreatorKnown() || !creatorEmail) return;

    try {
      setError(null);

      const isCreditMode = mode === "tip" || mode === "boost" || mode === "spin";
      const checkoutMode: CheckoutMode =
        kind === "pack" && isCreditMode ? `${mode}-pack` : mode;

      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: checkoutMode,
          creatorEmail,
          userEmail,
          source: "LIVE",
          targetId: sessionId,
          returnPath: `/live/${encodeURIComponent(sessionId)}${
            creatorEmail ? `?creator=${encodeURIComponent(creatorEmail)}` : ""
          }`,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("[live] checkout failed:", txt);
        setError(txt || "Checkout failed. Try again.");
        return;
      }

      const data = (await res.json().catch(() => ({}))) as CheckoutResponse;

      if (typeof data.url === "string" && data.url.length > 0) {
        window.location.href = data.url;
        return;
      }

      setError(data.error || "Stripe did not return a checkout URL.");
    } catch (err) {
      console.error("[live] error starting payment", err);
      setError("Error talking to Stripe.");
    }
  };

  /* ---------------------- Spend / support logic -------------------- */
  const handleSupportClick = async (mode: LiveMode) => {
    if (!ensureLoggedIn() || !userEmail || supportBusy) return;

    setSupportBusy(true);
    try {
      setError(null);

      if (mode === "reaction" || mode === "vote") {
        await startPayment(mode, "single");
        return;
      }

      const available =
        mode === "tip"
          ? credits?.tip ?? 0
          : mode === "boost"
          ? credits?.boost ?? 0
          : credits?.spin ?? 0;

      if (available > 0) {
        const updated = await spendOneCredit(userEmail, mode);
        setCredits(updated);
        return;
      }

      setPendingPurchase({ mode });
    } catch (err) {
      console.error("[live] support error", err);
      setError("Could not apply support. Try again.");
    } finally {
      setSupportBusy(false);
    }
  };

  const handleSingle = async (mode: PurchaseMode) => {
    await startPayment(mode, "single");
    setPendingPurchase(null);
  };

  const handlePack = async (mode: PurchaseMode) => {
    await startPayment(mode, "pack");
    setPendingPurchase(null);
  };

  /* ---------------------- UI helpers ------------------------------- */
  const creditsSummary = useMemo(() => {
    if (!credits) return null;
    const total =
      (credits.tip ?? 0) + (credits.boost ?? 0) + (credits.spin ?? 0);
    if (total <= 0) return null;

    const parts: string[] = [];
    if (credits.tip > 0)
      parts.push(`${credits.tip} tip${credits.tip === 1 ? "" : "s"}`);
    if (credits.boost > 0)
      parts.push(`${credits.boost} boost${credits.boost === 1 ? "" : "s"}`);
    if (credits.spin > 0)
      parts.push(`${credits.spin} spin${credits.spin === 1 ? "" : "s"}`);
    return parts.join(" • ");
  }, [credits]);

  // Missing creds screen (host)
  if (isHost && (!activeToken || !lkUrl)) {
    return (
      <main className="live-room min-h-screen bg-[#05070C] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/30 p-6">
          <h1 className="text-xl font-semibold">Go Live</h1>
          <p className="mt-2 text-white/70">
            Missing host credentials. Please start again from{" "}
            <span className="font-mono">/go-live</span>.
          </p>

          <button
            className="mt-5 w-full rounded-xl bg-emerald-400 px-5 py-3 text-center font-medium text-black hover:bg-emerald-300"
            onClick={() => router.push("/go-live")}
          >
            Back to Go Live
          </button>

          <button
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-center font-medium text-white/90 hover:bg-white/10"
            onClick={() => router.push("/public-feed")}
          >
            Back to feed
          </button>
        </div>
      </main>
    );
  }

  /** ===================== MOBILE: ONE SCREEN ===================== */
  if (isMobile) {
    return (
      <div className="live-room bg-[#050814] text-white h-[100dvh] w-full overflow-hidden">
        {/* Top overlay header */}
        <div className="absolute top-0 inset-x-0 z-40 px-4 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Live on Revolvr
              </h1>
              <p className="text-[11px] text-white/55 mt-1">
                {isHost ? "Host mode • " : ""}
                Room: <span className="font-mono">{sessionId}</span>
              </p>
            </div>

            <button
              onClick={() => router.push("/public-feed")}
              className="text-xs px-3 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10"
            >
              Back to feed
            </button>
          </div>

          {!userEmail && (
            <div className="mt-2 text-xs text-white/70">
              <a
                className="underline"
                href={`/login?redirectTo=${encodeURIComponent(liveHrefForRedirect)}`}
              >
                Login to support this stream
              </a>
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-xl bg-red-500/10 text-red-200 text-sm px-3 py-2 flex justify-between items-center">
              <span>{error}</span>
              <button
                className="text-xs underline"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Full-screen video surface */}
        <div className="absolute inset-0">
          <VideoStage
            token={activeToken}
            serverUrl={lkUrl}
            isMobile={true}
            isHost={isHost}
            joined={joined}
          />
        </div>

        {/* Floating messages overlay */}
        <div className="absolute inset-0 z-40 pointer-events-none">
          <LiveChatOverlay roomId={sessionId} />
        </div>

        {/* Bottom composer-only bar */}
        <div className="inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-50 px-3 fixed bottom-[var(--bottom-rail-h)] pb-[calc(env(safe-area-inset-bottom)+12px)] bottom-[calc(var(--bottom-rail-h)+env(safe-area-inset-bottom)+12px)]">
          <LiveChatPanel
            roomId={sessionId}
            liveHrefForRedirect={liveHrefForRedirect}
            userEmail={userEmail}
            variant="composer"
          />
        </div>

        {/* Host join button */}
        {isHost && !joined && (
          <div className="absolute inset-x-0 bottom-[86px] z-50 px-3">
            <button
              className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-black font-semibold hover:bg-emerald-300"
              onClick={() => setJoined(true)}
            >
              Go Live
            </button>
            <p className="mt-2 text-xs text-white/60">
              Required on mobile to enable camera/microphone permissions.
            </p>
          </div>
        )}
      </div>
    );
  }

  /** ===================== DESKTOP: TWO COLUMN ===================== */
  return (
    <div className="live-room min-h-screen bg-[#050814] text-white flex flex-col">
      <main className="flex-1 w-full px-4 py-4 pb-24">
        <div className="mx-auto w-full max-w-6xl grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          {/* LEFT */}
          <div className="min-w-0 flex flex-col gap-4">
            {!userEmail && (
              <div className="w-full max-w-xl mb-1 text-xs text-white/70">
                <a
                  className="underline"
                  href={`/login?redirectTo=${encodeURIComponent(liveHrefForRedirect)}`}
                >
                  Login to support this stream
                </a>
              </div>
            )}

            {error && (
              <div className="w-full max-w-xl mb-1 rounded-xl bg-red-500/10 text-red-200 text-sm px-3 py-2 flex justify-between items-center">
                <span>{error}</span>
                <button className="text-xs underline" onClick={() => setError(null)}>
                  Dismiss
                </button>
              </div>
            )}

            <header className="w-full max-w-xl mb-2 flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                  Live on Revolvr
                </h1>
                <p className="text-xs text-white/50 mt-1">
                  {isHost ? "Host mode • " : ""}
                  Room: <span className="font-mono">{sessionId}</span>
                </p>
              </div>
              <button
                onClick={() => router.push("/public-feed")}
                className="text-xs px-3 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10"
              >
                Back to feed
              </button>
            </header>

            {isHost && !joined && (
              <div className="w-full max-w-xl">
                <button
                  className="rounded-xl bg-emerald-400 px-4 py-2 text-black font-medium hover:bg-emerald-300"
                  onClick={() => setJoined(true)}
                >
                  Go Live
                </button>
                <p className="mt-2 text-xs text-white/60">
                  Required on mobile to enable camera/microphone permissions.
                </p>
              </div>
            )}

            <VideoStage
              token={activeToken}
              serverUrl={lkUrl}
              isMobile={false}
              isHost={isHost}
              joined={joined}
            />

            {!isHost && (
              <section className="w-full max-w-xl rounded-2xl bg-[#070b1b] border border-white/10 p-4 shadow-md shadow-black/40 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm sm:text-base font-semibold">
                    Support this stream
                  </h2>
                  {userEmail && (
                    <span className="text-[11px] text-white/45 truncate max-w-[160px] text-right">
                      Signed in as {userEmail}
                    </span>
                  )}
                </div>

                <p className="text-xs text-white/60">
                  Use your credits first. If you run out, you’ll be taken straight to Stripe to top up.
                </p>

                <p className="text-[11px] text-white/55 mt-1">
                  {creditsLoading
                    ? "Checking your credits…"
                    : creditsSummary
                    ? `Credits available: ${creditsSummary}.`
                    : "No credits yet – your first support will open a quick checkout."}
                </p>

                <div className="mt-2 grid grid-cols-5 gap-2 text-[11px] sm:text-xs">
                  <button
                    type="button"
                    disabled={supportBusy}
                    onClick={() => handleSupportClick("tip")}
                    className="rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/60 px-3 py-2 text-left transition disabled:opacity-60"
                  >
                    <div className="font-semibold">Tip</div>
                    <div className="text-emerald-200/80 mt-0.5">From A$2</div>
                  </button>

                  <button
                    type="button"
                    disabled={supportBusy}
                    onClick={() => handleSupportClick("boost")}
                    className="rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/60 px-3 py-2 text-left transition disabled:opacity-60"
                  >
                    <div className="font-semibold">Boost</div>
                    <div className="text-indigo-200/80 mt-0.5">From A$5</div>
                  </button>

                  <button
                    type="button"
                    disabled={supportBusy}
                    onClick={() => handleSupportClick("spin")}
                    className="rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-400/60 px-3 py-2 text-left transition disabled:opacity-60"
                  >
                    <div className="font-semibold">Spin</div>
                    <div className="text-pink-200/80 mt-0.5">From A$1</div>
                  </button>

                  <button
                    type="button"
                    disabled={supportBusy}
                    onClick={() => handleSupportClick("reaction")}
                    className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 px-3 py-2 text-left transition disabled:opacity-60"
                  >
                    <div className="font-semibold">React</div>
                    <div className="text-white/70 mt-0.5">A$0.50</div>
                  </button>

                  <button
                    type="button"
                    disabled={supportBusy}
                    onClick={() => handleSupportClick("vote")}
                    className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 px-3 py-2 text-left transition disabled:opacity-60"
                  >
                    <div className="font-semibold">Vote</div>
                    <div className="text-white/70 mt-0.5">A$0.50</div>
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* RIGHT: chat panel */}
          <aside className="hidden lg:block h-full">
            <LiveChatPanel
              roomId={sessionId}
              liveHrefForRedirect={liveHrefForRedirect}
              userEmail={userEmail}
              variant="panel"
            />
          </aside>
        </div>

        {pendingPurchase && (
          <LivePurchaseChoiceSheet
            mode={pendingPurchase.mode}
            onClose={() => setPendingPurchase(null)}
            onSingle={() => handleSingle(pendingPurchase.mode)}
            onPack={() => handlePack(pendingPurchase.mode)}
          />
        )}
      </main>
    </div>
  );
}

/* ---------------------- Video Stage ---------------------- */

function VideoStage({
  token,
  serverUrl,
  isMobile,
  isHost,
  joined,
}: {
  token: string;
  serverUrl: string;
  isMobile: boolean;
  isHost: boolean;
  joined: boolean;
}) {
  const ready = Boolean(token && serverUrl);

  function StageConference({ isMobile }: { isMobile: boolean }) {
    const tracks = useTracks(
      [
        { source: Track.Source.ScreenShare, withPlaceholder: false },
        { source: Track.Source.Camera, withPlaceholder: false },
      ],
      // host should see local as well
      { onlySubscribed: !isHost }
    );

    if (isMobile) {
      const active =
        tracks.find((t) => (t as any)?.source === Track.Source.ScreenShare) ||
        tracks.find((t) => (t as any)?.source === Track.Source.Camera) ||
        null;

      return (
        <div className="h-full w-full">
          {active ? (
            <ParticipantTile trackRef={active as any} className="h-full w-full" />
          ) : (
            <div className="h-full w-full grid place-items-center text-white/50 text-sm">
              Waiting for video…
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0">
          <GridLayout tracks={tracks as any} className="h-full">
            <ParticipantTile />
          </GridLayout>
        </div>
        <div className="shrink-0">
          <ControlBar />
        </div>
      </div>
    );
  }

  // Host should not connect until joined
  const shouldConnect = isHost ? joined : true;

  return (
    <section className={isMobile ? "w-full h-full" : "w-full max-w-xl"}>
      <div className="relative w-full h-full overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        <div
          className={
            isMobile
              ? "relative w-full h-[100dvh]"
              : "relative aspect-video w-full max-h-[72vh] min-h-[320px]"
          }
        >
          {ready ? (
            <LiveKitRoom
              token={token}
              serverUrl={serverUrl}
              connect={shouldConnect}
              audio={isHost && joined}
              video={isHost && joined}
              data-lk-theme="default"
              className="h-full"
            >
              <RoomAudioRenderer />
              <StageConference isMobile={isMobile} />
            </LiveKitRoom>
          ) : (
            <div className="h-full w-full grid place-items-center text-white/50 text-sm">
              Connecting…
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------------- Purchase choice sheet ---------------------- */

type LivePurchaseChoiceSheetProps = {
  mode: PurchaseMode;
  onClose: () => void;
  onSingle: () => void;
  onPack: () => void;
};

function LivePurchaseChoiceSheet({
  mode,
  onClose,
  onSingle,
  onPack,
}: LivePurchaseChoiceSheetProps) {
  const modeLabel = mode === "tip" ? "Tip" : mode === "boost" ? "Boost" : "Spin";

  const singleAmount = mode === "tip" ? "A$2" : mode === "boost" ? "A$5" : "A$1";
  const packAmount = mode === "tip" ? "A$20" : mode === "boost" ? "A$50" : "A$20";

  const packLabel =
    mode === "tip" ? "tip pack" : mode === "boost" ? "boost pack" : "spin pack";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm mb-6 mx-4 rounded-2xl bg-[#070b1b] border border-white/10 p-4 space-y-3 shadow-lg shadow-black/40">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Support with a {modeLabel}</h2>
          <button onClick={onClose} className="text-xs text-white/50 hover:text-white">
            Close
          </button>
        </div>

        <p className="text-xs text-white/60">
          Choose a one-off {modeLabel.toLowerCase()} or grab a {packLabel} to avoid
          checking out each time.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={onSingle}
            className="flex-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/60 px-3 py-2 text-xs text-left"
          >
            <div className="font-semibold">
              Single {modeLabel} ({singleAmount})
            </div>
            <div className="text-[11px] text-emerald-200/80">Quick one-off support</div>
          </button>

          <button
            type="button"
            onClick={onPack}
            className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 px-3 py-2 text-xs text-left"
          >
            <div className="font-semibold">
              Buy {packLabel} ({packAmount})
            </div>
            <div className="text-[11px] text-white/70">
              Better value, more {modeLabel.toLowerCase()}s
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full text-[11px] text-white/45 hover:text-white/70 mt-1"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
