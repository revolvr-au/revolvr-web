"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";


export default function LivePage() {
  const params = useParams<{ streamId: string }>();
  const streamId = params?.streamId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCreator = searchParams.get('creator') === '1';
  const creatorStreamKey = searchParams.get('key');
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const ivsMode = searchParams.get('ivs') === '1';
  const ivsPlaybackUrl = searchParams.get('playback');
  const [displayName, setDisplayName] = useState<string>("viewer");
  const [viewerCount, setViewerCount] = useState(0);
  const [ended, setEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [tapped, setTapped] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Keep broadcast alive if coming from go-live page
  useEffect(() => {
    return () => {
      // Only clean up when leaving the live page entirely
      // not when navigating to it
    };
  }, []);

  useEffect(() => {
    if (!isCreator || !creatorStreamKey) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let wakeLock: any = null
    let heartbeat: ReturnType<typeof setInterval> | null = null

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (mediaRecorderRef.current?.state === 'inactive') {
          mediaRecorderRef.current.start(100)
        }
      }
    }

    const startStreaming = async () => {
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
  video: { 
    width: { ideal: 1280 }, 
    height: { ideal: 720 }, 
    facingMode: 'user',
    frameRate: { ideal: 30 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 44100
  },
})
        cameraStreamRef.current = cameraStream

        // Keep screen awake and MediaRecorder alive
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wakeLock = await (navigator as any).wakeLock?.request('screen')
        } catch { /* wake lock unsupported */ }

        const broadcastUrl = process.env.NEXT_PUBLIC_BROADCAST_URL
        if (!broadcastUrl) {
          console.error('NEXT_PUBLIC_BROADCAST_URL not set')
          return
        }
        const wsUrl = `${broadcastUrl}?key=${creatorStreamKey}`
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
            ? 'video/webm;codecs=vp8,opus'
            : 'video/webm'

          const mr = new MediaRecorder(cameraStream, {
  mimeType,
  videoBitsPerSecond: 2500000,
  audioBitsPerSecond: 128000,
})
          mediaRecorderRef.current = mr

          mr.ondataavailable = (e) => {
            if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
              ws.send(e.data)
            }
          }

          mr.start(100)

          document.addEventListener('visibilitychange', handleVisibilityChange)

          // Force MediaRecorder to keep going with a heartbeat
          heartbeat = setInterval(() => {
            if (mediaRecorderRef.current?.state === 'inactive') {
              mediaRecorderRef.current.start(100)
            }
          }, 2000)
        }

        ws.onerror = (err) => console.error('WS error:', err)
      } catch (err) {
        console.error('Failed to start streaming:', err)
      }
    }

    startStreaming()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (heartbeat) clearInterval(heartbeat)
      wakeLock?.release()
      mediaRecorderRef.current?.stop()
      wsRef.current?.close()
      cameraStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [isCreator, creatorStreamKey])

  // Get current user
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setDisplayName(data.user?.email?.split("@")[0] ?? "viewer");
    });
  }, []);

  // Load stream data
  useEffect(() => {
    if (!streamId) return;
    if (ivsMode) {
      // IVS mode - no stream lookup needed, playback URL is in query param
      fetch(`/api/live/stream/${streamId}`).then(r=>r.json()).then(d=>{ if(d.stream) setStream(d.stream) });
      return;
    }
    fetch(`/api/live/stream/${streamId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.stream) {
          setStream(data.stream);
          if (data.stream.status === "ENDED") setEnded(true);
        }
      });
  }, [streamId]);

// Load IVS player script once
useEffect(() => {
  if (document.getElementById('ivs-player-script')) return
  const script = document.createElement('script')
  script.id = 'ivs-player-script'
  script.src = 'https://player.live-video.net/1.29.0/amazon-ivs-player.min.js'
  document.head.appendChild(script)
}, [])

// Playback
useEffect(() => {
  if (!videoRef.current || !stream || stream.status === 'IDLE') return
  const video = videoRef.current

  const src = stream?.ivsPlaybackUrl
    ? decodeURIComponent(stream.ivsPlaybackUrl)
    : stream?.muxPlaybackId
      ? `https://stream.mux.com/${stream.muxPlaybackId}.m3u8`
      : null
  if (!src) return

  let ivsPlayer: any = null
  let hls: any = null

  const initPlayer = async () => {
    if (stream?.ivsPlaybackUrl) {
      // Wait for IVS CDN script to be ready
      await new Promise<void>((resolve) => {
        const check = () => {
          if ((window as any).IVSPlayer) resolve()
          else setTimeout(check, 100)
        }
        check()
      })
      const IVSPlayer = (window as any).IVSPlayer
      
      ivsPlayer = IVSPlayer.create()
      ivsPlayer.attachHTMLVideoElement(video)

      const { PlayerEventType, ErrorType } = IVSPlayer
      ivsPlayer.addEventListener(PlayerEventType.ERROR, (err: any) => {
        console.warn('[IVS] error:', err)
        if (err.type === ErrorType.NOT_AVAILABLE) {
          setTimeout(() => {
            ivsPlayer.load(src)
            ivsPlayer.play()
          }, 3000)
        }
      })

      ivsPlayer.load(src)
      ivsPlayer.play()
      return
    }

    // Mux / HLS.js fallback
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      video.load()
      video.muted = true
      video.play().catch(() => {})
      return
    }
    const { default: Hls } = await import('hls.js')
    if (Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: true })
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {})
      })
    }
  }

  initPlayer()

  // Force video to fill container — IVS SDK overrides dimensions
  const observer = new MutationObserver(() => {
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.position = 'absolute'
    video.style.inset = '0'
    video.style.objectFit = 'cover'
  })
  observer.observe(video, { attributes: true, attributeFilter: ['width', 'height', 'style'] })

  return () => {
    observer.disconnect()
    if (ivsPlayer) ivsPlayer.delete()
    if (hls) hls.destroy()
    video.pause()
    video.removeAttribute('src')
    video.load()
  }
}, [stream?.muxPlaybackId, stream?.ivsPlaybackUrl, stream?.status])

// Poll stream status until active
useEffect(() => {
  if (!streamId) return
  if (stream?.status === 'ACTIVE') return

  const interval = setInterval(async () => {
    const res = await fetch(`/api/live/stream/${streamId}`)
    const data = await res.json()
    if (data.stream) {
      setStream(data.stream)
      if (data.stream.status === 'ACTIVE') {
        clearInterval(interval)
      }
    }
  }, 10000)

  return () => clearInterval(interval)
}, [streamId, stream?.status])

  // Supabase realtime chat
  useEffect(() => {
    if (!streamId) return;
    const supabase = createSupabaseBrowserClient();

    // Load recent messages
    supabase
      .from("live_chat_messages")
      .select("*")
      .eq("room_id", streamId)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data);
      });

    // Subscribe to new messages
    const channel = supabase
      .channel(`live:${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `room_id=eq.${streamId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev.slice(-99), payload.new]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !streamId) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.from("live_chat_messages").insert({
      room_id: streamId,
      user_email: userEmail,
      display_name: displayName,
      message: chatInput.trim(),
    });
    setChatInput("");
  };

  const endStream = async () => {
    await fetch("/api/live/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streamId }),
    });
    router.push("/public-feed");
  };

  return (
    <div style={{
      height: "100dvh", width: "100%", maxWidth: 420,
      margin: "0 auto", background: "#000",
      position: "relative", overflow: "hidden",
    }}>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        @keyframes commentSlideIn {
          from { transform: translateX(-60px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* 1. Video fullscreen */}
      <video
        ref={videoRef}
        autoPlay playsInline muted
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%", objectFit: "cover",
          background: "#000",
        }}
      />

      {/* Stream ended overlay */}
      {ended && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.82)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 50,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📴</div>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>Stream ended</div>
          </div>
        </div>
      )}

      {/* 2. Creator character image — top left, 45% screen height */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={stream?.avatarLiveUrl ?? stream?.avatarUrl ?? `/character_${stream?.characterId ?? 1}.png`}
        alt=""
        style={{
          position: "absolute", top: 0, left: 0,
          height: "160px", width: "auto",
          objectFit: "contain",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />

      {/* 7. Back button — top left, above character */}
      <button
        onClick={() => router.back()}
        style={{
          position: "absolute", top: 12, left: 12,
          background: "rgba(0,0,0,0.3)", border: "none",
          color: "#fff", fontSize: 20, width: 30, height: 30,
          borderRadius: "50%", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 30,
        }}
      >
        ‹
      </button>

      {/* 8. End stream button — top right, creator only */}
      {isCreator && !ended && (
        <button
          onClick={endStream}
          style={{
            position: "absolute", top: 12, right: 14,
            background: "rgba(220,30,60,0.85)", border: "none",
            color: "#fff", fontSize: 11, fontWeight: 700,
            padding: "5px 13px", borderRadius: 20, cursor: "pointer",
            zIndex: 30,
          }}
        >
          End
        </button>
      )}

      {/* 3. Creator name + LIVE badge — just below character */}
      <div style={{
        position: "absolute", top: "44%", left: 12,
        display: "flex", flexDirection: "column", gap: 5,
        zIndex: 20,
      }}>
        {stream && (
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
            {stream.displayName ?? stream.creatorEmail?.split("@")[0]}
          </div>
        )}
        {!ended && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(0,0,0,0.35)", borderRadius: 20,
            padding: "3px 9px 3px 7px",
            width: "fit-content",
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#D4AF37",
              animation: "livePulse 1.6s ease-in-out infinite",
              flexShrink: 0,
            }} />
            <span style={{ color: "#D4AF37", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}>LIVE</span>
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>{viewerCount}</span>
          </div>
        )}
      </div>

      {/* 4. Floating comments — left, 50%–85% of screen */}
      <div style={{
        position: "absolute", left: 12, top: "50%", height: "35%",
        width: "72%", overflow: "hidden",
        zIndex: 20,
        maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
      } as React.CSSProperties}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, paddingTop: 4 }}>
          {messages.slice(-10).map((msg, i) => (
            <div
              key={msg.id ?? i}
              style={{
                display: "flex", gap: 5, alignItems: "baseline",
                animation: "commentSlideIn 0.3s ease-out both",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "#D4AF37", flexShrink: 0, lineHeight: 1.4 }}>
                {msg.display_name ?? msg.user_email?.split("@")[0] ?? "viewer"}
              </span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.88)", lineHeight: 1.4 }}>
                {msg.message}
              </span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Unmute button */}
      {isMuted && (
        <button
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.muted = false;
              setIsMuted(false);
            }
          }}
          style={{
            position: "absolute", top: 56, right: 14,
            background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.18)",
            color: "#fff", fontSize: 11, fontWeight: 600,
            padding: "5px 11px", borderRadius: 20, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
            zIndex: 20, backdropFilter: "blur(6px)",
          }}
        >
          🔇 Tap to unmute
        </button>
      )}

      {/* 5. Gift button — bottom right, above input */}
      <button
        style={{
          position: "absolute", right: 14, bottom: 70,
          width: 46, height: 46, borderRadius: "50%",
          background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.14)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, cursor: "pointer", zIndex: 20,
          backdropFilter: "blur(6px)",
        }}
      >
        🎁
      </button>

      {/* 6. Chat input — bottom, full width, ultra minimal */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "8px 12px 20px",
        display: "flex", alignItems: "center", gap: 8,
        zIndex: 20,
      }}>
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Say something..."
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: 28,
            color: "#fff", fontSize: 13, padding: "10px 16px",
            outline: "none",
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            background: "transparent", border: "none",
            color: "#D4AF37", fontSize: 20, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "2px 4px", flexShrink: 0,
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}