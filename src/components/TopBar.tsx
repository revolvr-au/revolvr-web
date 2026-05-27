"use client";

import { usePathname, useRouter } from "next/navigation";

const GOLD = "#F5C518";

function VoltageSpark({ size = 8, color = GOLD }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" />
    </svg>
  );
}

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

  const onTranche = pathname?.startsWith("/tranche") ?? false;
  const label = onTranche ? "TRANCHE" : "REVOLVR";
  const target = onTranche ? "/public-feed" : "/tranche";

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
