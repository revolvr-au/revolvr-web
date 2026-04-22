"use client";

import { useRouter } from "next/navigation";
import FeedLayout from "@/components/FeedLayout";
import { useRingStatus } from "@/hooks/useRingStatus";
import { hasRing } from "@/lib/ringGates";

export function TrancheContent() {
  const router = useRouter();
  const { ringTier, loading } = useRingStatus();
  const isGold = !loading && hasRing(ringTier, "GOLD");
  const showLock = !loading && !isGold;

  return (
    <FeedLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
      `}</style>
      <div style={{
        height: "100dvh",
        overflowY: "auto",
        paddingTop: 72,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        paddingLeft: 20,
        paddingRight: 20,
        scrollbarWidth: "none",
      }}>
        {/* Title */}
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 64,
          letterSpacing: 3,
          color: "white",
          margin: "0 0 8px",
          lineHeight: 1,
        }}>
          TRANCHE
        </h1>

        <p style={{ fontSize: 13, color: "#555", margin: "0 0 32px", lineHeight: 1.6 }}>
          Structured discussion.
        </p>

        <div style={{ borderTop: "1px solid #1a1510", marginBottom: 32 }} />

        {loading ? null : showLock ? (
          /* ── LOCKED ── */
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            paddingTop: 40,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 40 }}>🔒</div>

            <div>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 28,
                letterSpacing: 2,
                color: "#F59E0B",
                marginBottom: 6,
              }}>
                GOLD RING REQUIRED
              </div>
              <p style={{ fontSize: 13, color: "#555", lineHeight: 1.7, maxWidth: 280, margin: "0 auto" }}>
                TRANCHE is exclusive to Gold Ring members. Upgrade to get early access when it launches.
              </p>
            </div>

            {/* Blurred preview */}
            <div style={{
              width: "100%",
              maxWidth: 340,
              borderRadius: 12,
              border: "1px solid rgba(245,158,11,0.15)",
              background: "rgba(245,158,11,0.04)",
              padding: "16px 18px",
              filter: "blur(4px)",
              pointerEvents: "none",
              userSelect: "none",
            }}>
              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.8, margin: 0 }}>
                TRANCHE converts comments into threaded topic conversations — giving every voice
                a place to go deeper. Instead of a flat stream of replies, TRANCHE organises
                discussion around ideas, so the best conversations rise to the surface.
              </p>
            </div>

            <button
              onClick={() => router.push("/rings")}
              style={{
                background: "#F59E0B",
                border: "none",
                borderRadius: 999,
                padding: "12px 32px",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "monospace",
                letterSpacing: "1px",
                color: "#0a0806",
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              GET GOLD RING
            </button>
          </div>
        ) : (
          /* ── UNLOCKED (Gold+) ── */
          <div>
            <p style={{ fontSize: 13, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
              TRANCHE converts comments into threaded topic conversations — giving every voice
              a place to go deeper. Instead of a flat stream of replies, TRANCHE organises
              discussion around ideas, so the best conversations rise to the surface.
            </p>

            <div style={{ borderTop: "1px solid #1a1510", marginBottom: 32 }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{
                fontFamily: "monospace",
                fontSize: 10,
                letterSpacing: 2,
                color: "#F59E0B",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: 4,
                padding: "4px 10px",
                textTransform: "uppercase",
                alignSelf: "flex-start",
              }}>
                Gold Early Access
              </span>
              <span style={{
                fontFamily: "monospace",
                fontSize: 10,
                letterSpacing: 2,
                color: "#00e5ff",
                border: "1px solid rgba(0,229,255,0.3)",
                borderRadius: 4,
                padding: "4px 10px",
                textTransform: "uppercase",
                alignSelf: "flex-start",
              }}>
                Coming Soon
              </span>
            </div>
          </div>
        )}
      </div>
    </FeedLayout>
  );
}

// Route stub — content rendered in TabShell
export default function TranchePage() { return null; }
