"use client";

import { usePathname, useRouter } from "next/navigation";

const GOLD = "#ffffff";

function VoltageSpark({ size = 8, color = GOLD }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" />
    </svg>
  );
}

// Travelling-underline tuning. Kept as plain consts so switching the sweep
// from an infinite loop to "settle after N passes" is a one-line change:
// set SWEEP_PASSES to a number-as-string (e.g. "3").
const SWEEP_DURATION = "2.4s";
const SWEEP_PASSES = "infinite";

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

  const onTranche = pathname?.startsWith("/tranche") ?? false;
  const label = onTranche ? "TRANCHE" : "REVOLVR";
  const target = onTranche ? "/public-feed" : "/tranche";

  // The vertical wordmark is the DESTINATION (the tap navigates there).
  const destination = onTranche ? "REVOLVR" : "TRANCHE";

  // Contrast the vertical treatment against each surface: light-on-dark on the
  // feed, dark-on-light on the TRANCHE surface (a white sweep would vanish there).
  const destColor = onTranche ? "#0F1115" : "rgba(255,255,255,0.9)";
  const lineBase = onTranche ? "rgba(15,17,21,0.18)" : "rgba(255,255,255,0.18)";
  const sweepColor = onTranche ? "#0F1115" : "#ffffff";

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
            ? `0 0 10px ${GOLD}, 0 0 18px rgba(255,255,255,0.55)`
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

      {/* DESTINATION wordmark: vertical, tight against the left wall, just below
          the horizontal one. Same onTranche/target/aria-label — no new routing.
          The button is the generous (>=44px) hit-zone; the treatment stays slim. */}
      <button
        onClick={() => router.push(target)}
        aria-label={`Go to ${onTranche ? "REVOLVR" : "TRANCHE"}`}
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 44px)",
          left: 0,
          zIndex: 80,
          minWidth: 44, // hit-zone extends well past the slim visible treatment
          background: "transparent",
          border: "none",
          padding: "0 0 0 6px", // hug the wall; extra width falls to the right
          cursor: "pointer",
          display: "inline-flex",
          flexDirection: "row",
          alignItems: "stretch", // line stretches to the wordmark's exact length
          justifyContent: "flex-start",
          gap: 6,
        }}
      >
        <span
          key={destination}
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)", // read bottom-to-top, glyphs upright-tilted
            color: destColor,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "monospace",
            letterSpacing: "0.28em",
            lineHeight: 1,
            animation: "wordmarkSwap 260ms ease-out",
          }}
        >
          {destination}
        </span>
        <span
          className="tranche-line"
          style={{ background: lineBase }}
          aria-hidden
        >
          <span
            className="tranche-sweep"
            style={{
              backgroundImage: `linear-gradient(to bottom, transparent 0%, ${sweepColor} 50%, transparent 100%)`,
              animation: `trancheSweep ${SWEEP_DURATION} ease-in-out ${SWEEP_PASSES}`,
            }}
          />
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
        .tranche-line {
          position: relative;
          width: 2px;
          border-radius: 1px;
          overflow: hidden; /* keeps the sweep inside the line's length */
          align-self: stretch;
        }
        .tranche-sweep {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 100%;
          transform: translateY(-100%);
        }
        @keyframes trancheSweep {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .tranche-sweep { animation: none !important; opacity: 0; }
        }
      `}</style>
    </>
  );
}
