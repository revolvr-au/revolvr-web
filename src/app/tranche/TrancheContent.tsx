"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FeedLayout from "@/components/FeedLayout";
import TrancheCard, { TrancheFeedItem } from "@/components/tranche/TrancheCard";
import HotTrancheCard, { HotEvent } from "@/components/tranche/HotTrancheCard";
import TMenuSheet from "@/components/tranche/TMenuSheet";
import OriginalCard, { OriginalItem } from "@/components/tranche/OriginalCard";
import OriginalComposer from "@/components/tranche/OriginalComposer";
import { createSupabaseBrowserClient } from "@/supabase-browser";

const GOLD = "#F5C518";
const SLATE = "#2C3E50";
const PAGE_SIZE = 20;

type Tab = "originals" | "trending" | "network" | "new";

const TABS: { key: Tab; label: string }[] = [
  { key: "originals", label: "ORIGINALS" },
  { key: "trending", label: "TRENDING" },
  { key: "network", label: "NETWORK" },
  { key: "new", label: "NEW" },
];

export function TrancheContent() {
  const [tab, setTab] = useState<Tab>("originals");
  const [items, setItems] = useState<TrancheFeedItem[]>([]);
  const [originalItems, setOriginalItems] = useState<OriginalItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [viewerEmail, setViewerEmail] = useState<string | null>(null);
  const [hotEvent, setHotEvent] = useState<HotEvent | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  // ── Hot TRANCHE — fetch on mount, then every 60s ─────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadHot = async () => {
      try {
        const res = await fetch("/api/tranche/hot", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const next: HotEvent | null = data?.ok && data.event ? data.event : null;
        setHotEvent((prev) => {
          if (!next) return null;
          if (prev && prev.id === next.id && prev.voltsPerHour === next.voltsPerHour) {
            return prev;
          }
          return next;
        });
      } catch {
        /* swallow — keep the previous card visible if the poll fails */
      }
    };

    loadHot();
    const id = window.setInterval(loadHot, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(({ data }) => {
      setViewerEmail(data.user?.email ?? null);
    });
  }, []);

  const loadPage = useCallback(
    async (opts: { reset: boolean }) => {
      if (loading) return;
      const reqId = ++requestIdRef.current;
      setLoading(true);
      try {
        if (tab === "originals") {
          const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
          if (!opts.reset && cursor) params.set("cursor", cursor);
          const res = await fetch(
            `/api/tranche/originals/feed?${params.toString()}`,
          );
          const data = await res.json();
          if (reqId !== requestIdRef.current) return;
          const newItems: OriginalItem[] = data?.items ?? [];
          setOriginalItems((prev) =>
            opts.reset ? newItems : [...prev, ...newItems],
          );
          setCursor(data?.nextCursor ?? null);
          setHasMore(Boolean(data?.nextCursor));
          return;
        }

        const params = new URLSearchParams({
          tab,
          limit: String(PAGE_SIZE),
        });
        if (!opts.reset && cursor) params.set("cursor", cursor);
        if (tab === "network" && viewerEmail) {
          params.set("viewerEmail", viewerEmail);
        }
        const res = await fetch(`/api/tranche/feed?${params.toString()}`);
        const data = await res.json();
        if (reqId !== requestIdRef.current) return;
        const newItems: TrancheFeedItem[] = data?.items ?? [];
        setItems((prev) => (opts.reset ? newItems : [...prev, ...newItems]));
        setCursor(data?.nextCursor ?? null);
        setHasMore(Boolean(data?.nextCursor));
      } catch {
        if (reqId === requestIdRef.current) {
          setHasMore(false);
        }
      } finally {
        if (reqId === requestIdRef.current) setLoading(false);
      }
    },
    [tab, cursor, loading, viewerEmail],
  );

  useEffect(() => {
    if (tab === "network" && !viewerEmail) return;
    setItems([]);
    setOriginalItems([]);
    setCursor(null);
    setHasMore(true);
    requestIdRef.current++;
    loadPage({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, viewerEmail]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadPage({ reset: false });
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, loadPage]);

  const isOriginals = tab === "originals";

  return (
    <FeedLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Bebas+Neue&display=swap');
      `}</style>
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-label="Open TRANCHE menu"
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 52px)",
          right: 14,
          zIndex: 81,
          background: "transparent",
          border: "none",
          padding: "4px 6px",
          color: "#0A0A0A",
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "0.04em",
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        T
      </button>
      {isOriginals && (
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          aria-label="New Original"
          style={{
            position: "absolute",
            top: "calc(env(safe-area-inset-top, 0px) + 48px)",
            right: 54,
            zIndex: 81,
            width: 32,
            height: 32,
            borderRadius: 999,
            background: "transparent",
            border: `1px solid ${SLATE}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <PencilIcon color={SLATE} />
        </button>
      )}
      <TMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        viewerEmail={viewerEmail}
      />
      <OriginalComposer
        viewerEmail={viewerEmail}
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={(item) => setOriginalItems((prev) => [item, ...prev])}
      />
      <div
        style={{
          height: "100dvh",
          overflowY: "auto",
          paddingTop: 72,
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
          paddingLeft: 16,
          paddingRight: 16,
          scrollbarWidth: "none",
        }}
      >
        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 56,
            letterSpacing: 3,
            color: "#0a0a0a",
            margin: "0 0 4px",
            lineHeight: 1,
          }}
        >
          TRANCHE
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 13,
            color: "rgba(0,0,0,0.55)",
            margin: "0 0 22px",
          }}
        >
          Comments that broke out.
        </p>

        {!isOriginals && hotEvent && (
          <HotTrancheCard
            key={hotEvent.id}
            event={hotEvent}
            viewerEmail={viewerEmail}
            onVolted={(v) =>
              setHotEvent((prev) =>
                prev
                  ? { ...prev, stats: { ...prev.stats, currentVoltage: v } }
                  : prev,
              )
            }
          />
        )}

        {/* SUB-TABS */}
        <div
          style={{
            display: "flex",
            gap: 24,
            borderBottom: "1px solid rgba(0,0,0,0.1)",
            marginBottom: 18,
          }}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "10px 0",
                  borderBottom: active ? `2px solid ${GOLD}` : "2px solid transparent",
                  color: active ? "#0a0a0a" : "rgba(0,0,0,0.45)",
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  fontWeight: 700,
                  cursor: "pointer",
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {isOriginals ? (
          originalItems.length === 0 && !loading ? (
            <EmptyState
              title="NO ORIGINALS YET"
              hint="Tap the pencil to post the first take."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {originalItems.map((item) => (
                <OriginalCard
                  key={item.id}
                  item={item}
                  viewerEmail={viewerEmail}
                  onVolted={(postId, v) => {
                    setOriginalItems((prev) =>
                      prev.map((p) =>
                        p.id === postId ? { ...p, voltage: v } : p,
                      ),
                    );
                  }}
                />
              ))}
              <div ref={sentinelRef} style={{ height: 24 }} />
              {loading && <LoadingRow />}
              {!hasMore && originalItems.length > 0 && <EndRow />}
            </div>
          )
        ) : tab === "network" && !viewerEmail ? (
          <EmptyState
            title="SIGN IN TO SEE YOUR NETWORK"
            hint="The NETWORK tab needs your account."
          />
        ) : items.length === 0 && !loading ? (
          <EmptyState
            title={tab === "network" ? "NO TRANCHES FROM YOUR NETWORK" : "NO TRANCHES YET"}
            hint={
              tab === "network"
                ? "Link with creators to see their breakouts here."
                : "Comments cross the threshold and show up here."
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {items.map((item) => (
              <TrancheCard
                key={item.id}
                item={item}
                viewerEmail={viewerEmail}
                onVolted={(v) => {
                  setItems((prev) =>
                    prev.map((p) =>
                      p.id === item.id
                        ? { ...p, stats: { ...p.stats, currentVoltage: v } }
                        : p,
                    ),
                  );
                }}
              />
            ))}
            <div ref={sentinelRef} style={{ height: 24 }} />
            {loading && <LoadingRow />}
            {!hasMore && items.length > 0 && <EndRow />}
          </div>
        )}
      </div>
    </FeedLayout>
  );
}

function LoadingRow() {
  return (
    <div
      style={{
        fontFamily: "'Space Grotesk', monospace",
        fontSize: 10,
        letterSpacing: "0.2em",
        color: "rgba(0,0,0,0.35)",
        textAlign: "center",
        padding: "8px 0 16px",
      }}
    >
      LOADING…
    </div>
  );
}

function EndRow() {
  return (
    <div
      style={{
        fontFamily: "'Space Grotesk', monospace",
        fontSize: 9,
        letterSpacing: "0.22em",
        color: "rgba(0,0,0,0.25)",
        textAlign: "center",
        padding: "4px 0 16px",
      }}
    >
      END OF FEED
    </div>
  );
}

function PencilIcon({ color }: { color: string }) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        paddingTop: 64,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 28,
          letterSpacing: 3,
          color: "rgba(0,0,0,0.22)",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 12,
          color: "rgba(0,0,0,0.5)",
          maxWidth: 280,
        }}
      >
        {hint}
      </div>
    </div>
  );
}
