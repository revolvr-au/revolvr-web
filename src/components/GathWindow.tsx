"use client";

import { useEffect, useRef, useState } from "react";
import {
  Users,
  Lock,
  Briefcase,
  ChevronRight,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

const GOLD = "#F5C518";

type GathType = "OPEN" | "PRIVATE" | "BUSINESS";

export type GathWindowProps = {
  open: boolean;
  onClose: () => void;
  userEmail: string | null;
  seedPostId?: string | null;
  prefillName?: string;
  prefillDescription?: string;
  seedTrancheEventId?: string | null;
  /** "simple" hides BUSINESS row — used from PeopleCard */
  mode?: "full" | "simple";
};

function SparkIcon({ size = 14, color = GOLD }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" />
    </svg>
  );
}

export default function GathWindow({
  open,
  onClose,
  userEmail,
  seedPostId,
  prefillName,
  prefillDescription,
  seedTrancheEventId,
  mode = "full",
}: GathWindowProps) {
  const [sheetType, setSheetType] = useState<GathType | null>(null);

  useEffect(() => {
    if (!open) setSheetType(null);
  }, [open]);

  if (!open) return null;

  const handleRowTap = (type: GathType) => {
    setSheetType(type);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(3px)",
        zIndex: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "gathWindowFade 200ms ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 360,
          background: "rgba(8,12,20,0.98)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 20,
          padding: "20px 18px 18px",
          fontFamily: "var(--font-stack)",
          color: "#fff",
          boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 18,
          }}
        >
          <SparkIcon size={14} color={GOLD} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.28em",
              color: GOLD,
            }}
          >
            GATH
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              marginLeft: "auto",
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        <GathRow
          title="START A GATH"
          subtitle="Name this moment — post gets seeded in"
          icon={null}
          onTap={() => handleRowTap("OPEN")}
        />
        <GathRow
          title="PRIVATE GATH"
          subtitle="Invite only"
          icon={<Lock size={14} color="rgba(255,255,255,0.6)" />}
          onTap={() => handleRowTap("PRIVATE")}
        />
        {mode === "full" && (
          <GathRow
            title="BUSINESS GATH"
            subtitle="Verified brand community"
            icon={<Briefcase size={14} color="rgba(255,255,255,0.6)" />}
            onTap={() => handleRowTap("BUSINESS")}
          />
        )}

        {sheetType && (
          <GathCreateSheet
            type={sheetType}
            onClose={() => setSheetType(null)}
            onCreated={onClose}
            userEmail={userEmail}
            seedPostId={seedPostId ?? null}
            prefillName={prefillName}
            prefillDescription={prefillDescription}
            seedTrancheEventId={seedTrancheEventId ?? null}
          />
        )}
      </div>

      <style>{`
        @keyframes gathWindowFade {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function GathRow({
  title,
  subtitle,
  icon,
  onTap,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode | null;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 12px",
        marginBottom: 10,
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        color: "#fff",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--font-stack)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.18em",
            color: "#fff",
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "0.04em",
          }}
        >
          {subtitle}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <ChevronRight size={18} color={GOLD} />
      </div>
    </button>
  );
}

function GathCreateSheet({
  type,
  onClose,
  onCreated,
  userEmail,
  seedPostId,
  prefillName,
  prefillDescription,
  seedTrancheEventId,
}: {
  type: GathType;
  onClose: () => void;
  onCreated: () => void;
  userEmail: string | null;
  seedPostId: string | null;
  prefillName?: string;
  prefillDescription?: string;
  seedTrancheEventId?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(prefillName ?? "");
  const [description, setDescription] = useState(prefillDescription ?? "");
  const [preLaunch, setPreLaunch] = useState(false);
  const [launchDate, setLaunchDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    },
    [],
  );

  const showFlash = (msg: string) => {
    setFlash(msg);
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlash(null), 1100);
  };

  const handleIgnite = async () => {
    if (!name.trim() || submitting) return;
    if (!userEmail) {
      showFlash("SIGN IN REQUIRED");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/gath/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          type,
          sparkCost: type === "PRIVATE" ? 50 : 0,
          launchDate: preLaunch && launchDate ? launchDate : null,
          creatorEmail: userEmail,
          postId: seedPostId ?? null,
          trancheEventId: seedTrancheEventId ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        showFlash(data?.error || "FAILED");
        setSubmitting(false);
        return;
      }
      showFlash("GATH IGNITED");
      window.setTimeout(() => {
        onCreated();
        if (data.gath?.id) router.push(`/gath/${data.gath.id}`);
      }, 700);
    } catch {
      showFlash("FAILED");
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 700,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        animation: "gathSheetFade 200ms ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "rgba(8,12,20,0.99)",
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "18px 18px calc(env(safe-area-inset-bottom, 0px) + 22px)",
          fontFamily: "var(--font-stack)",
          color: "#fff",
          animation: "gathSheetSlide 240ms cubic-bezier(0.2,0.8,0.2,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <SparkIcon size={12} color={GOLD} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.26em",
              color: GOLD,
            }}
          >
            {type === "OPEN"
              ? "START A GATH"
              : type === "PRIVATE"
                ? "PRIVATE GATH"
                : "BUSINESS GATH"}
          </span>
          <button
            onClick={onClose}
            aria-label="Close sheet"
            style={{
              marginLeft: "auto",
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        <SheetInput
          label="NAME"
          value={name}
          onChange={setName}
          placeholder="What is this gath called"
          autoFocus
        />
        <SheetInput
          label="DESCRIPTION"
          value={description}
          onChange={setDescription}
          placeholder="Optional"
          multiline
        />

        {type === "BUSINESS" && (
          <div
            style={{
              padding: "10px 12px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 12,
              marginBottom: 12,
              fontSize: 10,
              letterSpacing: "0.16em",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            VERIFICATION REQUIRED
          </div>
        )}

        {type !== "BUSINESS" && (
          <div style={{ marginBottom: 14 }}>
            <button
              onClick={() => setPreLaunch((v) => !v)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${preLaunch ? GOLD : "rgba(255,255,255,0.07)"}`,
                borderRadius: 12,
                color: "#fff",
                cursor: "pointer",
                fontFamily: "var(--font-stack)",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  border: `1px solid ${preLaunch ? GOLD : "rgba(255,255,255,0.2)"}`,
                  background: preLaunch ? GOLD : "transparent",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  color: preLaunch ? GOLD : "rgba(255,255,255,0.65)",
                  fontWeight: 700,
                }}
              >
                SET AS PRE-LAUNCH GATH
              </span>
            </button>
            {preLaunch && (
              <input
                type="datetime-local"
                value={launchDate}
                onChange={(e) => setLaunchDate(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: "10px 12px",
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  color: "#fff",
                  fontFamily: "var(--font-stack)",
                  fontSize: 12,
                }}
              />
            )}
          </div>
        )}

        <button
          onClick={handleIgnite}
          disabled={!name.trim() || submitting}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 12,
            background: name.trim() ? GOLD : "rgba(245,197,24,0.25)",
            color: "#0a0e16",
            border: "none",
            fontFamily: "var(--font-stack)",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.28em",
            cursor: name.trim() && !submitting ? "pointer" : "not-allowed",
            boxShadow: name.trim()
              ? "0 6px 24px rgba(245,197,24,0.32)"
              : "none",
            transition: "all 200ms ease",
          }}
        >
          {submitting ? "IGNITING…" : "IGNITE"}
        </button>

        {flash && (
          <div
            style={{
              marginTop: 12,
              textAlign: "center",
              fontSize: 10,
              letterSpacing: "0.22em",
              color: GOLD,
            }}
          >
            {flash}
          </div>
        )}
      </div>

      <style>{`
        @keyframes gathSheetFade {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes gathSheetSlide {
          0% { transform: translateY(40px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function SheetInput({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const sharedStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "rgba(0,0,0,0.4)",
    border: `1px solid ${focused ? GOLD : "rgba(255,255,255,0.08)"}`,
    borderRadius: 10,
    color: "#fff",
    fontFamily: "var(--font-stack)",
    fontSize: 12,
    outline: "none",
    transition: "border 180ms ease",
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.24em",
          color: "rgba(255,255,255,0.6)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          style={{ ...sharedStyle, resize: "none" }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          style={sharedStyle}
        />
      )}
    </div>
  );
}
