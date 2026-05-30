"use client";

import { usePathname, useRouter } from "next/navigation";
import { useUnreadCount } from "@/hooks/useUnreadCount";

const GOLD = "#F5C518";

function VoltageSpark({ size = 8, color = GOLD }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" />
    </svg>
  );
}

function InboxIcon({ size = 22, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M3.5 6.5 12 12.5l8.5-6" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const unread = useUnreadCount();

  const onTranche = pathname?.startsWith("/tranche") ?? false;
  const label = onTranche ? "TRANCHE" : "REVOLVR";
  const target = onTranche ? "/public-feed" : "/tranche";
  const iconColor = onTranche ? "#0A0A0A" : "rgba(255,255,255,0.95)";

  return (
    <>
      <button
        onClick={() => router.push(target)}
        aria-label={`Go to ${onTranche ? "REVOLVR" : "TRANCHE"}`}
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 14px)",
          left: 14,
          zIndex: 80,
          background: "transparent",
          border: "none",
          padding: 0,
          color: onTranche ? GOLD : "rgba(255,255,255,0.95)",
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "monospace",
          letterSpacing: "0.28em",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          transition: "color 220ms ease, text-shadow 220ms ease",
          textShadow: onTranche
            ? `0 0 10px ${GOLD}, 0 0 18px rgba(245,197,24,0.55)`
            : "none",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            animation: "voltPulse 2s ease-in-out infinite",
          }}
        >
          <VoltageSpark size={8} />
        </span>
        <span
          key={label}
          style={{ display: "inline-block", animation: "wordmarkSwap 260ms ease-out" }}
        >
          {label}
        </span>
      </button>

      <button
        onClick={() => router.push("/messages")}
        aria-label={unread > 0 ? `Messages, ${unread} unread` : "Messages"}
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 14px)",
          right: 14,
          zIndex: 80,
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          lineHeight: 0,
        }}
      >
        <InboxIcon color={iconColor} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 8,
              background: GOLD,
              color: "#0A0A0A",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "system-ui, sans-serif",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      <style>{`
        @keyframes voltPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(1.18); }
        }
        @keyframes wordmarkSwap {
          0% { opacity: 0; transform: translateY(-2px); letter-spacing: 0.4em; }
          100% { opacity: 1; transform: translateY(0); letter-spacing: 0.28em; }
        }
      `}</style>
    </>
  );
}
