"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const INK = "#0F1115";
const INK_SOFT = "#4A4F58";
const INK_MUTE = "#7A7F88";
const ROSE = "#B85C5C";
const SHEET_BG = "#FFFFFF";
const SECTION_BG = "#FAF9F7";
const BORDER = "rgba(15,17,21,0.08)";

type TfcStatus = "none" | "pending" | "active" | "expired" | "suspended" | "professional";

type TfcStatusPayload = {
  ok: boolean;
  status?: TfcStatus;
  termEndsAt?: string | null;
};

type SinBinStatus = {
  ok: boolean;
  active: boolean;
  level: number;
  expiresAt?: string | null;
  struckOut?: boolean;
};

export default function TMenuSheet({
  open,
  onClose,
  viewerEmail,
}: {
  open: boolean;
  onClose: () => void;
  viewerEmail: string | null;
}) {
  const router = useRouter();
  const [tfcStatus, setTfcStatus] = useState<TfcStatus | null>(null);
  const [sinBin, setSinBin] = useState<SinBinStatus | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !viewerEmail) return;
    let cancelled = false;

    fetch(`/api/tfc/status?email=${encodeURIComponent(viewerEmail)}`)
      .then((r) => r.json() as Promise<TfcStatusPayload>)
      .then((d) => {
        if (!cancelled && d?.ok && d.status) setTfcStatus(d.status);
      })
      .catch(() => null);

    fetch(`/api/tranche/sin-bin/status?email=${encodeURIComponent(viewerEmail)}`)
      .then((r) => r.json() as Promise<SinBinStatus>)
      .then((d) => {
        if (!cancelled && d?.ok) setSinBin(d);
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [open, viewerEmail]);

  if (!open) return null;

  const go = (path: string) => {
    onClose();
    router.push(path);
  };

  const tfcStatusLabel = tfcStatus
    ? tfcStatus[0].toUpperCase() + tfcStatus.slice(1)
    : viewerEmail
      ? "…"
      : "Sign in";

  const sinBinLabel = sinBin
    ? sinBin.active
      ? sinBin.struckOut
        ? "Struck out"
        : `Level ${sinBin.level}${sinBin.expiresAt ? ` · ${formatTimeLeft(sinBin.expiresAt)}` : ""}`
      : "Clear"
    : viewerEmail
      ? "…"
      : "Sign in";

  return (
    <>
      <style>{`
        @keyframes tMenuFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tMenuSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 1000,
          animation: "tMenuFadeIn 200ms ease-out",
        }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label="TRANCHE menu"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: SHEET_BG,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          padding:
            "10px 0 calc(env(safe-area-inset-bottom, 0px) + 16px)",
          zIndex: 1001,
          maxHeight: "88dvh",
          overflowY: "auto",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: INK,
          boxShadow: "0 -12px 40px rgba(0,0,0,0.28)",
          animation: "tMenuSlideUp 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div
          onClick={onClose}
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: "rgba(15,17,21,0.18)",
            margin: "0 auto 14px",
            cursor: "pointer",
          }}
          aria-hidden
        />

        <Section label="HOW TRANCHE WORKS">
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "rgba(15,17,21,0.78)",
              margin: 0,
              padding: "0 4px",
            }}
          >
            VOLTing a comment pushes it toward TRANCHE. When enough people VOLT
            the same comment — and its voltage eclipses the post it sits on — it
            breaks out. You don&apos;t start a TRANCHE. You earn it.
          </p>
        </Section>

        <Section label="YOUR ACCESS">
          <Row
            title="Upgrade to Premium"
            meta="$12.99/mo"
            onClick={() => go("/rings")}
          />
          <Row
            title="Business Light"
            meta="$49/mo"
            onClick={() => go("/tranche/support?type=business-light")}
          />
          <Row
            title="Business Pro"
            meta="$299/mo"
            onClick={() => go("/tranche/support?type=business-pro")}
          />
          {tfcStatus === "none" && (
            <Row
              title="Apply for TFC Crew"
              meta="Fact-check programme"
              onClick={() => go("/tfc/apply")}
            />
          )}
          <Row title="My TFC Status" meta={tfcStatusLabel} static />
          <Row
            title="My Sin Bin Status"
            meta={sinBinLabel}
            metaColor={sinBin?.active ? ROSE : undefined}
            static
          />
        </Section>

        <Section label="PLATFORM RULES">
          <Row
            title="TRANCHE Terms & Conditions"
            onClick={() => go("/tranche/terms")}
          />
          <Row title="Sin Bin Rules" onClick={() => go("/tranche/rules")} />
          <Row
            title="Community Guidelines"
            onClick={() => go("/legal/guidelines")}
          />
        </Section>

        <Section label="BUSINESS">
          <Row
            title="Business Support"
            onClick={() => go("/tranche/support")}
          />
          <Row
            title="TFC Professional Enquiry"
            onClick={() => go("/tranche/support?type=tfc")}
          />
        </Section>

        <button
          onClick={onClose}
          style={{
            display: "block",
            margin: "16px auto 0",
            background: "transparent",
            border: "none",
            color: INK_MUTE,
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 11,
            letterSpacing: "0.22em",
            fontWeight: 700,
            cursor: "pointer",
            padding: "8px 16px",
          }}
        >
          CLOSE
        </button>
      </div>
    </>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ margin: "0 14px 14px" }}>
      <div
        style={{
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontSize: 10,
          letterSpacing: "0.24em",
          fontWeight: 700,
          color: INK_MUTE,
          padding: "0 6px 8px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          background: SECTION_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({
  title,
  meta,
  metaColor,
  onClick,
  static: isStatic,
}: {
  title: string;
  meta?: string;
  metaColor?: string;
  onClick?: () => void;
  static?: boolean;
}) {
  const content = (
    <>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: INK,
          flex: 1,
          textAlign: "left",
        }}
      >
        {title}
      </span>
      {meta && (
        <span
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: metaColor ?? INK_SOFT,
            letterSpacing: "0.04em",
          }}
        >
          {meta}
        </span>
      )}
      {!isStatic && (
        <span
          aria-hidden
          style={{
            marginLeft: 10,
            color: INK_MUTE,
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ›
        </span>
      )}
    </>
  );

  const baseStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "14px 16px",
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${BORDER}`,
    fontFamily: "inherit",
    cursor: isStatic ? "default" : "pointer",
    textAlign: "left",
  };

  if (isStatic) {
    return <div style={baseStyle}>{content}</div>;
  }
  return (
    <button onClick={onClick} style={baseStyle}>
      {content}
    </button>
  );
}

function formatTimeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expiring";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m left`;
  const h = Math.floor(m / 60);
  return `${h}h left`;
}
