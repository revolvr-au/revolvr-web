"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRingStatus } from "@/hooks/useRingStatus";
import { RING_COLORS } from "@/components/RingRim";
import { createSupabaseBrowserClient } from "@/supabase-browser";

type TierConfig = {
  tier: string;
  label: string;
  price: string;
  priceNote?: string;
  features: string[];
  buttonLabel: string;
  buttonAction: "checkout" | "contact" | "invite" | "none";
  contactHref?: string;
  highlight?: boolean;
};

const TIERS: TierConfig[] = [
 {
    tier: "NONE",
    label: "No Ring",
    price: "Free",
    features: [
      "Feed access",
      "Post content",
      "Basic profile",
      "Link with creators",
      "25% revenue share on gifts",
    ],
    buttonLabel: "Current plan",
    buttonAction: "none",
  },
  {
    tier: "BLUE",
    label: "Blue Ring",
    price: "$12.99",
    priceNote: "/month",
    features: [
      "Everything in No Ring",
      "35% revenue share on gifts",
      "Blue ring badge",
      "Verified creator status",
      "PEOPLE tab access",
    ],
    buttonLabel: "Get Blue Ring",
    buttonAction: "checkout",
    highlight: true,
  },
  {
    tier: "GOLD",
    label: "Gold Ring",
    price: "$29.99",
    priceNote: "/month",
    features: [
      "Everything in Blue",
      "45% revenue share on gifts",
      "Gold ring badge",
      "TRANCHE early access",
      "Priority in feed",
    ],
    buttonLabel: "Get Gold Ring",
    buttonAction: "checkout",
  },
  ];
const TIER_RANK: Record<string, number> = {
  NONE: 0, BLUE: 1, GOLD: 2,
};

function RingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ringTier, loading: statusLoading } = useRingStatus();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "cancelled"; tier?: string } | null>(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const cancelled = searchParams.get("cancelled");
    const tier = searchParams.get("tier");
    if (success === "1") setBanner({ type: "success", tier: tier ?? undefined });
    else if (cancelled === "1") setBanner({ type: "cancelled" });
  }, [searchParams]);

  const handleCheckout = async (tier: string) => {
    setError(null);
    setLoadingTier(tier);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session }, error: sessionError } =
        await supabase.auth.getSession();

      console.log("Session:", session ? "EXISTS" : "NULL");
      console.log("Session error:", sessionError);
      console.log("Access token:", session?.access_token ? "EXISTS" : "NULL");
      console.log("User email:", session?.user?.email);

      const res = await fetch("/api/ring/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? {
            "Authorization": `Bearer ${session.access_token}`
          } : {}),
        },
        body: JSON.stringify({ tier, accessToken: session?.access_token ?? null }),
      });
      const data = await res.json();
      console.log("Checkout response:", data);
      if (!res.ok) {
        setError(data.error ?? "Checkout failed. Please try again.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoadingTier(null);
    }
  };

  const userRank = TIER_RANK[ringTier] ?? 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050814",
      color: "white",
      fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <style>{`
        * { box-sizing: border-box; }
      `}</style>

      {/* ── TOP NAV ── */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "#050814",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: 520,
        margin: "0 auto",
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.6)",
            fontSize: 20,
            cursor: "pointer",
            lineHeight: 1,
            padding: "4px 2px",
          }}
        >←</button>
        <div style={{
          fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700,
          fontSize: 18,
          letterSpacing: 5,
          color: "white",
        }}>
          RINGS
        </div>
        <div style={{ width: 28 }} />
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px 80px" }}>

        {/* ── BANNER ── */}
        {banner && (
          <div style={{
            marginBottom: 20,
            padding: "12px 16px",
            borderRadius: 10,
            background: banner.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${banner.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`,
            fontSize: 13,
            color: banner.type === "success" ? "#10B981" : "rgba(255,255,255,0.6)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            {banner.type === "success" ? (
              <>✓ {banner.tier ? `${banner.tier} Ring activated!` : "Ring activated!"} Welcome to your new tier.</>
            ) : (
              <>Checkout cancelled. No charge was made.</>
            )}
          </div>
        )}

        {/* ── ERROR ── */}
        {error && (
          <div style={{
            marginBottom: 20,
            padding: "12px 16px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            fontSize: 13,
            color: "#EF4444",
          }}>
            {error}
          </div>
        )}

        {/* ── CURRENT PLAN ── */}
        {!statusLoading && (
          <div style={{
            marginBottom: 28,
            padding: "10px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 12,
            fontFamily: "monospace",
            letterSpacing: "0.5px",
          }}>
            {ringTier !== "NONE" && (
              <div style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: RING_COLORS[ringTier] ?? "#444",
                boxShadow: `0 0 6px ${RING_COLORS[ringTier] ?? "#444"}`,
                flexShrink: 0,
              }} />
            )}
            <span style={{ color: "rgba(255,255,255,0.6)", letterSpacing: "1px", textTransform: "uppercase" }}>
              Current plan:
            </span>
            <span style={{ color: ringTier !== "NONE" ? (RING_COLORS[ringTier] ?? "white") : "rgba(255,255,255,0.6)" }}>
              {ringTier === "NONE" ? "No Ring" : `${ringTier.charAt(0) + ringTier.slice(1).toLowerCase()} Ring`}
            </span>
          </div>
        )}

        {/* ── TIER CARDS ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {TIERS.map((t) => {
            const color = RING_COLORS[t.tier] ?? "rgba(255,255,255,0.2)";
            const isCurrent = t.tier === ringTier;
            const isDowngrade = TIER_RANK[t.tier] < userRank && t.tier !== "NONE";
            const isLoading = loadingTier === t.tier;

            return (
              <div
                key={t.tier}
                style={{
                  borderRadius: 14,
                  border: isCurrent
                    ? `1.5px solid ${color}`
                    : t.highlight
                    ? "1.5px solid rgba(59,130,246,0.35)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: isCurrent
                    ? `rgba(${hexToRgb(color)}, 0.06)`
                    : t.highlight
                    ? "rgba(59,130,246,0.04)"
                    : "rgba(255,255,255,0.02)",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {/* Left colour bar */}
                {t.tier !== "NONE" && (
                  <div style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: color,
                    borderRadius: "14px 0 0 14px",
                  }} />
                )}

                <div style={{ padding: "16px 18px 16px 22px" }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {t.tier !== "NONE" && (
                        <div style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: color,
                          boxShadow: `0 0 8px ${color}80`,
                          flexShrink: 0,
                          marginTop: 2,
                        }} />
                      )}
                      <div>
                        <div style={{
                          fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700,
                          fontSize: 20,
                          letterSpacing: 1.5,
                          color: isCurrent ? color : "white",
                          lineHeight: 1.1,
                        }}>
                          {t.label}
                        </div>
                        {isCurrent && (
                          <div style={{
                            fontSize: 9,
                            fontFamily: "monospace",
                            letterSpacing: 2,
                            color: color,
                            textTransform: "uppercase",
                            marginTop: 2,
                          }}>
                            Current plan
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{
                        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700,
                        fontSize: 22,
                        color: t.tier === "NONE" ? "rgba(255,255,255,0.6)" : "white",
                        letterSpacing: 0.5,
                      }}>
                        {t.price}
                      </span>
                      {t.priceNote && (
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", marginLeft: 2 }}>
                          {t.priceNote}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <ul style={{ margin: "0 0 14px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                    {t.features.map((f) => (
                      <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                        <span style={{ color: t.tier === "NONE" ? "rgba(255,255,255,0.25)" : color, fontSize: 10, flexShrink: 0 }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Button */}
                  {t.buttonAction === "none" || isCurrent ? (
                    <div style={{
                      textAlign: "center",
                      padding: "9px 0",
                      fontSize: 11,
                      fontFamily: "monospace",
                      letterSpacing: "1px",
                      color: "rgba(255,255,255,0.2)",
                      textTransform: "uppercase",
                    }}>
                      {isCurrent ? "Active" : "Free"}
                    </div>
                  ) : t.buttonAction === "invite" ? (
                    <div style={{
                      textAlign: "center",
                      padding: "9px 0",
                      fontSize: 11,
                      fontFamily: "monospace",
                      letterSpacing: "1px",
                      color: "rgba(239,68,68,0.5)",
                      textTransform: "uppercase",
                    }}>
                      By Invitation
                    </div>
                  ) : t.buttonAction === "contact" ? (
                    <a
                      href={t.contactHref}
                      style={{
                        display: "block",
                        textAlign: "center",
                        padding: "10px 0",
                        borderRadius: 999,
                        background: "rgba(16,185,129,0.1)",
                        border: "1px solid rgba(16,185,129,0.3)",
                        fontSize: 12,
                        fontFamily: "monospace",
                        letterSpacing: "1px",
                        fontWeight: 700,
                        color: "#10B981",
                        textDecoration: "none",
                        textTransform: "uppercase",
                      }}
                    >
                      Contact Us
                    </a>
                  ) : (
                    <button
                      disabled={isLoading || isDowngrade}
                      onClick={() => handleCheckout(t.tier)}
                      style={{
                        width: "100%",
                        padding: "10px 0",
                        borderRadius: 999,
                        border: "none",
                        background: isDowngrade ? "rgba(255,255,255,0.04)" : color,
                        color: isDowngrade ? "rgba(255,255,255,0.25)" : (t.tier === "BLUE" || t.tier === "GOLD" ? "#050814" : "white"),
                        fontSize: 12,
                        fontFamily: "monospace",
                        letterSpacing: "1px",
                        fontWeight: 700,
                        cursor: isDowngrade ? "default" : "pointer",
                        textTransform: "uppercase",
                        opacity: isLoading ? 0.6 : 1,
                        transition: "opacity 0.2s",
                      }}
                    >
                      {isLoading ? "Loading…" : isDowngrade ? "Lower tier" : t.buttonLabel}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          marginTop: 32,
          textAlign: "center",
          fontSize: 11,
          fontFamily: "monospace",
          color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.5px",
          lineHeight: 1.8,
        }}>
          Subscriptions renew monthly. Cancel anytime.<br />
          Questions? revolvrassist@gmail.com
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "255,255,255";
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

export default function RingsPage() {
  return (
    <Suspense>
      <RingsPageInner />
    </Suspense>
  );
}
