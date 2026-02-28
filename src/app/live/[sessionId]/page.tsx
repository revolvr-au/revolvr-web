"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

// IMPORTANT: LiveKit is heavy; load only after user taps.
const LiveKitClient = dynamic(() => import("./LiveKitClient"), { ssr: false });

export default function LiveRoomPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();

  const safeSessionId = params?.sessionId ?? "";
  const sessionId = useMemo(() => {
    try {
      return decodeURIComponent(safeSessionId);
    } catch {
      return safeSessionId;
    }
  }, [safeSessionId]);

  const role = searchParams?.get("role") || "";
  const isHost = role === "host";

  // Mobile detect (guarded)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    try {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(mobile);
    } catch {
      setIsMobile(false);
    }
  }, []);

  // Join control: desktop auto-joins, mobile requires tap
  const [joined, setJoined] = useState(false);
  useEffect(() => {
    if (!isMobile) setJoined(true);
  }, [isMobile]);

  // Token load (lightweight)
  const [lkUrl, setLkUrl] = useState("");
  const [token, setToken] = useState("");
  const [tokenErr, setTokenErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId) return;

    (async () => {
      try {
        setTokenErr(null);
        const res = await fetch("/api/live/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            role: isHost ? "host" : "viewer",
          }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          if (!cancelled) setTokenErr(`Token error ${res.status}: ${txt || "no body"}`);
          return;
        }

        const data = await res.json().catch(() => null) as any;
        const nextUrl = typeof data?.url === "string" ? data.url : "";
        const nextToken = typeof data?.token === "string" ? data.token : "";

        if (!cancelled) {
          setLkUrl(nextUrl);
          setToken(nextToken);
        }
      } catch (e: any) {
        if (!cancelled) setTokenErr(e?.message || "Token fetch failed");
      }
    })();

  return () => {
  cancelled = true;
};
  }, [sessionId, isHost]);

  const ready = Boolean(token && lkUrl);

  return (
    <div className="bg-[#050814] text-white h-[100dvh] w-full relative">
      {/* clean debug (only shows if token fails) */}
      {tokenErr ? (
        <div className="absolute top-3 left-3 right-3 z-50 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {tokenErr}
        </div>
      ) : null}

      {/* Mobile tap gate */}
      {!joined && isMobile && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <button
            onClick={() => setJoined(true)}
            className="px-6 py-4 rounded-2xl bg-emerald-400 text-black font-semibold text-lg"
          >
            Tap to Join Live
          </button>
        </div>
      )}

      {/* Only mount LiveKit AFTER join + token ready */}
      {joined && ready ? (
        <LiveKitClient
          token={token}
          lkUrl={lkUrl}
          isMobile={isMobile}
          // host should publish; viewers only subscribe
          onlySubscribed={!isHost}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/60">
          Loading live session...
        </div>
      )}
    </div>
  );
}
