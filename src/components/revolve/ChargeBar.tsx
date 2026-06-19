"use client";

// src/components/revolve/ChargeBar.tsx
//
// Minimal, peripheral charge indicator: a thin segmented bar on the right edge. One segment
// per cadenceN; segments light up as completed flicks accumulate, so a full bar telegraphs
// the imminent revolve. pointer-events:none — it never captures touches or competes with
// feed/action UI. Rendered ONLY when revolveConfig.enabled (caller-gated).

export default function ChargeBar({
  charge,
  cadenceN,
}: {
  charge: number;
  cadenceN: number;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        right: 6,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column-reverse", // fills from the bottom up
        gap: 4,
        pointerEvents: "none",
        zIndex: 30,
      }}
    >
      {Array.from({ length: cadenceN }).map((_, i) => {
        const filled = i < charge;
        return (
          <span
            key={i}
            style={{
              width: 3,
              height: 18,
              borderRadius: 2,
              background: filled ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.15)",
              boxShadow: filled ? "0 0 6px rgba(255,255,255,0.55)" : "none",
              transition: "background 200ms ease, box-shadow 200ms ease",
            }}
          />
        );
      })}
    </div>
  );
}
