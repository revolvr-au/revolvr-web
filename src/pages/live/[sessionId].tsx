// src/pages/live/[sessionId].tsx
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { supabase } from "@/lib/supabaseClients";

type ViewerData = {
  sessionId: string;
  roomName: string;
  viewerIdentity: string;
  viewerToken: string;
  livekitUrl: string;
  title?: string | null;
  status?: "live" | "ended" | string;
  tip_count?: number;
  boost_count?: number;
  spin_count?: number;
};

type SupportMode = "tip" | "boost" | "spin";

export default function ViewerPage() {
  const router = useRouter();
  const { sessionId } = router.query;

  const [data, setData] = useState<ViewerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);

  const [supportLoading, setSupportLoading] = useState<SupportMode | null>(
    null
  );
  const [pendingSupportMode, setPendingSupportMode] =
    useState<SupportMode | null>(null);

  // 🔐 Normalise sessionId for TS
  const id = useMemo(() => {
    if (typeof sessionId === "string") return sessionId;
    if (Array.isArray(sessionId) && sessionId.length > 0) return sessionId[0];
    return "";
  }, [sessionId]);

  // 🔄 Load viewer token + LiveKit details
  useEffect(() => {
    let cancelled = false;
    if (!id) return;

    const fetchViewer = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/live/${encodeURIComponent(id)}/viewer`);

        if (!res.ok) {
          const text = await res.text();
          console.error("viewer api error:", text);
          throw new Error(`Viewer API error ${res.status}`);
        }

        const json = await res.json();
        if (cancelled) return;

        const fixed: ViewerData = {
          ...json,
          sessionId: json.sessionId ?? id,
          viewerToken:
            typeof json.viewerToken === "string"
              ? json.viewerToken
              : json.viewerToken?.token ?? "",
        };

        setData(fixed);
        setError(null);
      } catch (e: any) {
        console.error("viewer fetch error", e);
        if (!cancelled) {
          setError(e?.message ?? "Failed to load live session");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchViewer();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // 👤 Load logged-in viewer email
  useEffect(() => {
    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUserEmail(user?.email ?? null);
      } catch (e) {
        console.error("viewer user load error", e);
      }
    };

    loadUser();
  }, []);

  // 🎉 Success message after Stripe redirect
  useEffect(() => {
    if (router.query.success === "1") {
      alert("Thanks for supporting the creator!");
    }
  }, [router.query.success]);

  const shareUrl =
    typeof window !== "undefined" && id
      ? `${window.location.origin}/live/${encodeURIComponent(id)}`
      : "";

  const ensureLoggedIn = () => {
    if (!userEmail) {
      const redirect = encodeURIComponent(
        `/live/${encodeURIComponent(id || "")}`
      );
      router.push(`/login?redirectTo=${redirect}`);
      return false;
    }
    return true;
  };

  // 💸 Amounts (in cents) for each support mode
  const singleAmountForMode = (mode: SupportMode) => {
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

  const packAmountForMode = (mode: SupportMode) => {
    switch (mode) {
      case "tip":
        return 1000; // A$10 tip pack
      case "boost":
        return 2500; // A$25 boost pack
      case "spin":
      default:
        return 500; // A$5 spin pack
    }
  };

  // 🔁 Stripe checkout for tips / boosts / spins
  const handleSupport = async (
  mode: SupportMode,
  kind: "single" | "pack"
) => {
  if (!ensureLoggedIn()) return;
  if (!data) return;

  try {
    setSupportLoading(mode);

    const checkoutMode =
      kind === "pack"
        ? (`${mode}-pack` as "tip-pack" | "boost-pack" | "spin-pack")
        : mode;

    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: checkoutMode,
        userEmail,
        postId: data.sessionId, // we’re reusing this as postId
      }),
    });

    if (!res.ok) {
      console.error("checkout failed:", await res.text());
      alert("Revolvr glitched out starting checkout. Try again.");
      return;
    }

    const json = await res.json();
    if (json.url) {
      window.location.href = json.url;
    } else {
      alert("Stripe did not return a checkout URL.");
    }
  } catch (e) {
    console.error("support error", e);
    alert("Something went wrong talking to Stripe 😵‍💫");
  } finally {
    setSupportLoading(null);
    setPendingSupportMode(null);
  }
};



  // ❤️ simple local like (no backend yet)
  const handleLike = () => {
    if (hasLiked) {
      setHasLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      setHasLiked(true);
      setLikeCount((c) => c + 1);
    }
  };

  const handleCopyShare = () => {
    if (!shareUrl) return;
    navigator.clipboard
      .writeText(shareUrl)
      .catch((err) => console.error("copy failed", err));
  };

  if (loading && !data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading stream…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <p style={{ marginBottom: 12 }}>Couldn&apos;t load this stream.</p>
          <p style={{ fontSize: 14, color: "#aaa" }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const totalSupport =
    (data.tip_count ?? 0) +
    (data.boost_count ?? 0) +
    (data.spin_count ?? 0);

  const ended = data.status === "ended";

  // ⏹ If stream is ended, show nice ended state
  if (ended) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#02040a",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              border: "2px solid #444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 24,
            }}
          >
            ⏹
          </div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Stream ended</h1>
          <p style={{ fontSize: 14, color: "#aaa", marginBottom: 16 }}>
            This live is over. Head back to the main feed to see what&apos;s
            spinning now.
          </p>
          <button
            onClick={() => router.push("/public-feed")}
            style={{
              padding: "10px 24px",
              borderRadius: 999,
              border: "none",
              background: "#ff0055",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Back to feed
          </button>
        </div>
      </div>
    );
  }

  // 🎥 Live viewer UI
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#000", color: "#fff" }}>
      {/* Top HUD */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid #111",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)",
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#ff0055",
            }}
          />
          <span style={{ fontWeight: 600, fontSize: 14 }}>LIVE</span>
          <span
            style={{
              marginLeft: 10,
              fontSize: 13,
              color: "#ccc",
              maxWidth: 260,
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
            }}
          >
            {data.title ?? "Untitled stream"}
          </span>
        </div>

        <button
          onClick={handleCopyShare}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            border: "1px solid #444",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Copy share link
        </button>
      </header>

      <main
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Video area */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <LiveKitRoom
            serverUrl={data.livekitUrl}
            token={data.viewerToken}
            connect={true}
            video={true}
            audio={true}
          >
            <VideoConference />
          </LiveKitRoom>
        </div>

        {/* Support bar */}
        <div
          style={{
            borderTop: "1px solid #111",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.85))",
            padding: "10px 12px",
          }}
        >
          <div
            style={{
              maxWidth: 960,
              margin: "0 auto",
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
              }}
            >
              <button
                onClick={() => {
                  if (!ensureLoggedIn()) return;
                  setPendingSupportMode("tip");
                }}
                disabled={supportLoading === "tip"}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(16,185,129,0.7)",
                  background: "rgba(16,185,129,0.15)",
                  color: "#a7f3d0",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {supportLoading === "tip" ? "Opening…" : "Tip A$2"}
              </button>
              <button
                onClick={() => {
                  if (!ensureLoggedIn()) return;
                  setPendingSupportMode("boost");
                }}
                disabled={supportLoading === "boost"}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(129,140,248,0.8)",
                  background: "rgba(79,70,229,0.2)",
                  color: "#c7d2fe",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {supportLoading === "boost" ? "Opening…" : "Boost A$5"}
              </button>
              <button
                onClick={() => {
                  if (!ensureLoggedIn()) return;
                  setPendingSupportMode("spin");
                }}
                disabled={supportLoading === "spin"}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(244,114,182,0.8)",
                  background: "rgba(236,72,153,0.2)",
                  color: "#f9a8d4",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {supportLoading === "spin" ? "Opening…" : "Spin A$1"}
              </button>

              <button
                onClick={handleLike}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "none",
                  background: hasLiked ? "#f97373" : "rgba(248,113,113,0.2)",
                  color: "#fee2e2",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>{hasLiked ? "❤️" : "🤍"}</span>
                <span>Like</span>
                {likeCount > 0 && <span>· {likeCount}</span>}
              </button>
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginTop: 4,
              }}
            >
              {totalSupport > 0 ? (
                <span>
                  Support so far: 💸 {data.tip_count ?? 0} · 🚀{" "}
                  {data.boost_count ?? 0} · 🌀 {data.spin_count ?? 0}
                </span>
              ) : (
                <span>
                  Viewers can tip, boost or spin to support this stream.
                </span>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Single vs pack choice for live support */}
      {pendingSupportMode && (
        <SupportChoiceSheet
          mode={pendingSupportMode}
          onClose={() => setPendingSupportMode(null)}
          onSingle={() => handleSupport(pendingSupportMode!, "single")}
          onPack={() => handleSupport(pendingSupportMode!, "pack")}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Support choice sheet (live)                                        */
/* ------------------------------------------------------------------ */

type SupportChoiceSheetProps = {
  mode: SupportMode;
  onClose: () => void;
  onSingle: () => void;
  onPack: () => void;
};

function SupportChoiceSheet({
  mode,
  onClose,
  onSingle,
  onPack,
}: SupportChoiceSheetProps) {
  const modeLabel =
    mode === "tip" ? "Tip" : mode === "boost" ? "Boost" : "Spin";

  const singleAmount =
    mode === "tip" ? "A$2" : mode === "boost" ? "A$5" : "A$1";

  const packLabel =
    mode === "tip"
      ? "tip pack"
      : mode === "boost"
      ? "boost pack"
      : "spin pack";

  const packAmount =
    mode === "tip" ? "A$10" : mode === "boost" ? "A$25" : "A$5";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          margin: "0 16px 24px",
          borderRadius: 16,
          backgroundColor: "#050815",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: 16,
          color: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600 }}>
            Support this stream with a {modeLabel}
          </h2>
          <button
            onClick={onClose}
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.6)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.7)",
            marginBottom: 12,
          }}
        >
          Choose a one-off {modeLabel.toLowerCase()} or grab a pack so you
          don&apos;t have to check out every time.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <button
            type="button"
            onClick={onSingle}
            style={{
              flex: 1,
              borderRadius: 12,
              border: "1px solid rgba(16,185,129,0.8)",
              backgroundColor: "rgba(16,185,129,0.18)",
              padding: "10px 12px",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              Single {modeLabel} ({singleAmount})
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(209,250,229,0.85)",
                marginTop: 2,
              }}
            >
              Quick one-off support
            </div>
          </button>

          <button
            type="button"
            onClick={onPack}
            style={{
              flex: 1,
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.8)",
              backgroundColor: "rgba(15,23,42,0.9)",
              padding: "10px 12px",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              Buy {packLabel} ({packAmount})
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(148,163,184,0.9)",
                marginTop: 2,
              }}
            >
              Better value, more {modeLabel.toLowerCase()}s
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            marginTop: 2,
            fontSize: 11,
            color: "rgba(148,163,184,0.9)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
