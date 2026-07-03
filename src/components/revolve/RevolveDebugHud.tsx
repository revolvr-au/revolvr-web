"use client";

// src/components/revolve/RevolveDebugHud.tsx
//
// TEMPORARY debug HUD for "The Revolve" — renders ONLY when testMode is on (?testmode=1),
// which is itself gated behind the enabled flag + dev/preview. Purpose: diagnose why the
// charge accrues on desktop scroll but not on mobile touch-flick, WITHOUT a tethered
// Safari Web Inspector. It shows the live charge-path state directly on the device:
//
//   • scrolls   — count of raw registerScrollIndex calls. If this stays 0 on mobile,
//                 onScroll never fires and the whole path is dead upstream of the hook.
//   • index     — last raw rounded index reported by onScroll.
//   • settles   — count of resolved settle-timer ticks. Desktop discrete scroll produces
//                 many; if mobile momentum yields ~0, the 120ms quiet gap never lands.
//   • prev→settled — the last settle comparison. charge only accrues when settled > prev.
//   • charged   — whether that last settle counted (settled > prev).
//   • charge    — current charge / cadenceN.  • status — idle/armed/open/closing.
//
// DELETE this file (and its wiring in PublicFeedClient + the onDebug arg to useRevolve)
// before this branch goes anywhere near main.

import type { RevolveStatus } from "@/hooks/useRevolve";

export type RevolveDebugState = {
  scrollCount: number;
  lastIndex: number;
  settleCount: number;
  lastPrev: number;
  lastSettled: number;
  lastCharged: boolean;
};

export function RevolveDebugHud({
  debug,
  charge,
  cadenceN,
  status,
}: {
  debug: RevolveDebugState;
  charge: number;
  cadenceN: number;
  status: RevolveStatus;
}) {
  const rows: Array<[string, string]> = [
    ["scrolls", String(debug.scrollCount)],
    ["index", String(debug.lastIndex)],
    ["settles", String(debug.settleCount)],
    ["prev→settled", `${debug.lastPrev} → ${debug.lastSettled}`],
    ["charged", debug.lastCharged ? "yes" : "no"],
    ["charge", `${charge} / ${cadenceN}`],
    ["status", status],
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: "max(8px, env(safe-area-inset-top))",
        left: "8px",
        zIndex: 2147483647,
        pointerEvents: "none",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "11px",
        lineHeight: 1.35,
        color: "#d7f9e7",
        background: "rgba(3, 6, 18, 0.82)",
        border: "1px solid rgba(120, 240, 180, 0.35)",
        borderRadius: "8px",
        padding: "6px 8px",
        minWidth: "148px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ opacity: 0.6, marginBottom: 3, letterSpacing: "0.06em" }}>
        REVOLVE · testmode
      </div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <span style={{ opacity: 0.7 }}>{k}</span>
          <span
            style={{
              fontWeight: 600,
              color: k === "charged" ? (v === "yes" ? "#7cffb0" : "#ff9d9d") : "#eafff4",
            }}
          >
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}
