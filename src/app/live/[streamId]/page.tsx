"use client";

import { useEffect, useRef, useState } from "react";
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
      setStream({ status: 'ACTIVE', ivsPlaybackUrl });
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
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>

      {/* Video */}
      <div style={{ position: "absolute", inset: 0 }}>
        {/* src is set via useEffect — never set it as a JSX prop */}
        <video
          ref={videoRef}
          autoPlay playsInline muted
          style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) scale(2)", width: "100%", height: "100%", objectFit: "cover", background: "#000" }}
        />
        {/* Unmute button — iOS requires autoplay to start muted */}
        {isMuted && (
          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.muted = false
                setIsMuted(false)
              }
            }}
            style={{
              position: "absolute", bottom: 48, right: 12,
              background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff", fontSize: 11, fontWeight: 600,
              padding: "5px 10px", borderRadius: 20, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            🔇 Tap to unmute
          </button>
        )}
        {ended && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 16, fontWeight: 500,
          }}>
            Stream ended
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => router.back()}
          style={{
            position: "absolute", top: 16, left: 16,
            background: "rgba(0,0,0,0.5)", border: "none",
            color: "#fff", fontSize: 20, width: 36, height: 36,
            borderRadius: "50%", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ‹
        </button>

        {/* LIVE badge */}
        {!ended && (
          <div style={{
            position: "absolute", top: 16, left: 60,
            background: "#E5004C", color: "#fff",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
            padding: "4px 10px", borderRadius: 4,
          }}>
            LIVE
          </div>
        )}

        {/* Creator info */}
        {stream && (
          <div style={{
            position: "absolute", bottom: 12, left: 12,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#333", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 13, color: "#fff", fontWeight: 600,
            }}>
              {stream.creatorEmail?.[0]?.toUpperCase()}
            </div>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>
              {stream.creatorEmail?.split("@")[0]}
            </span>
          </div>
        )}

        {/* End stream (creator only) */}
        {isCreator && !ended && (
          <button
            onClick={endStream}
            style={{
              position: "absolute", top: 16, right: 16,
              background: "#E5004C", border: "none",
              color: "#fff", fontSize: 12, fontWeight: 600,
              padding: "6px 14px", borderRadius: 20, cursor: "pointer",
            }}
          >
            End
          </button>
        )}
      </div>

      {/* Chat — overlaid bottom left */}
      <div style={{
        position: "absolute", bottom: 70, left: 0, right: 0,
        height: "35%", overflowY: "auto", padding: "12px 12px 0",
        display: "flex", flexDirection: "column", gap: 8,
        background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)",
      }}>
        {messages.map((msg, i) => (
          <div key={msg.id ?? i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#aaa", flexShrink: 0 }}>
              {msg.display_name ?? msg.user_email?.split("@")[0] ?? "viewer"}
            </span>
            <span style={{ fontSize: 13, color: "#fff", lineHeight: 1.4 }}>
              {msg.message}
            </span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Chat input — overlaid at very bottom */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "10px 12px",
        display: "flex", gap: 8, alignItems: "center",
        background: "rgba(0,0,0,0.4)",
      }}>
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Say something..."
          style={{
            flex: 1, background: "rgba(255,255,255,0.08)",
            border: "none", borderRadius: 20,
            color: "#fff", fontSize: 13, padding: "8px 14px",
            outline: "none",
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            background: "#E5004C", border: "none",
            color: "#fff", fontSize: 13, fontWeight: 600,
            padding: "8px 16px", borderRadius: 20, cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}