"use client";

// src/components/revolve/RevolveOverlay.tsx
//
// Phase 3 — the revolve overlay. Skeleton chambers fan out from the docked post in their fixed
// positional grammar. PLACEHOLDERS ONLY (live previews come later).
//
// Loaded via next/dynamic from PublicFeedClient so this whole module stays out of the feed
// bundle when revolveConfig.enabled is false — it is only fetched on first open.
//
// Feel spec: fan-out ≤400ms, transform/opacity ONLY (GPU-composited, no layout thrash), total
// revolve ≤1.5s. Honours prefers-reduced-motion (instant, no stagger).

import { useEffect, useState } from "react";
import { chambersForCount } from "@/lib/revolve/chambers";
import Chamber from "./Chamber";

/** Distance from centre to each chamber. CSS length so layout stays resolution-independent. */
const RADIUS = "min(42vw, 34vh)";
/** Per-chamber stagger; with ≤6 chambers the last starts at 5×40 = 200ms (+200ms move ≤400ms). */
const STAGGER_MS = 40;
const MOVE_MS = 200;

export default function RevolveOverlay({
  status,
  chamberCount,
  onClose,
}: {
  status: "open" | "closing";
  chamberCount: number;
  onClose: () => void;
}) {
  const chambers = chambersForCount(chamberCount);
  const [expanded, setExpanded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect reduced-motion preference (overlay is ssr:false, so window is available).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  // Drive the fan-out: expand on the frame after mount; collapse when closing begins.
  useEffect(() => {
    if (status === "closing") {
      setExpanded(false);
      return;
    }
    const id = requestAnimationFrame(() => setExpanded(true));
    return () => cancelAnimationFrame(id);
  }, [status]);

  // Escape closes the revolve (parity with backdrop tap).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Revolve"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        // Backdrop dim fades with the overlay; opacity-only.
        background: "rgba(2,4,12,0.72)",
        opacity: expanded ? 1 : 0,
        transition: reducedMotion ? "none" : "opacity 180ms ease",
        // Captures ALL touches while open — the feed beneath is paused.
        touchAction: "none",
      }}
    >
      {/* Docked post placeholder — the real current post is "docked" in the centre. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "30vw",
          maxWidth: 170,
          aspectRatio: "3 / 4",
          transform: "translate(-50%, -50%)",
          borderRadius: 16,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 0 0 4px rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.5)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Docked
      </div>

      {chambers.map((c, i) => {
        const target = `translate(calc(${c.ux} * ${RADIUS}), calc(${c.uy} * ${RADIUS})) scale(1)`;
        const collapsed = "translate(0px, 0px) scale(0.2)";
        return (
          <Chamber
            key={c.slot}
            label={c.label}
            style={{
              transform: expanded ? target : collapsed,
              opacity: expanded ? 1 : 0,
              transition: reducedMotion
                ? "none"
                : `transform ${MOVE_MS}ms cubic-bezier(0.22,1,0.36,1) ${i * STAGGER_MS}ms, opacity 160ms ease ${i * STAGGER_MS}ms`,
            }}
          />
        );
      })}
    </div>
  );
}
