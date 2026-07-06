"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FeedLayout from "@/components/FeedLayout";
import { createSupabaseBrowserClient } from "@/supabase-browser";

const PASCAL_MID = "#FFFFFF";
const PASCAL_HIGH = "#F5F2EC";
const PASCAL_LOW = "#FAF9F7";
const INK = "#0F1115";
const INK_SOFT = "#4A4F58";
const INK_MUTE = "#7A7F88";
const ROSE = "#B85C5C";
const SLATE = "#2C3E50";

const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
  { code: "id", label: "Bahasa" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "tr", label: "Türkçe" },
];

const DOMAINS: { code: string; label: string }[] = [
  { code: "politics", label: "Politics" },
  { code: "science", label: "Science" },
  { code: "health", label: "Health" },
  { code: "climate", label: "Climate" },
  { code: "tech", label: "Tech" },
  { code: "sports", label: "Sports" },
  { code: "culture", label: "Culture" },
  { code: "finance", label: "Finance" },
];

type ExistingStatus = "none" | "pending" | "active" | "expired" | "suspended" | "professional";

export default function TFCApplyPage() {
  const router = useRouter();
  const [viewerEmail, setViewerEmail] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [existingStatus, setExistingStatus] = useState<ExistingStatus | null>(null);
  const [motivation, setMotivation] = useState("");
  const [languages, setLanguages] = useState<Set<string>>(new Set(["en"]));
  const [domains, setDomains] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Track the *visual* viewport height so the scroll container shrinks when the
  // iOS keyboard opens. A fixed 100dvh doesn't shrink for the keyboard, which
  // traps the bottom-anchored submit button behind it. null → fall back to
  // 100dvh (SSR + no-keyboard/desktop = current behaviour).
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const sync = () => setViewportHeight(vv.height);
    sync();
    vv.addEventListener("resize", sync);
    return () => vv.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(({ data }) => {
      setViewerEmail(data.user?.email ?? null);
      setAuthResolved(true);
    });
  }, []);

  useEffect(() => {
    if (!viewerEmail) return;
    fetch(`/api/tfc/status?email=${encodeURIComponent(viewerEmail)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setExistingStatus(d.status as ExistingStatus);
      })
      .catch(() => {});
  }, [viewerEmail]);

  const canSubmit = useMemo(
    () => motivation.trim().length >= 30 && languages.size > 0 && !submitting,
    [motivation, languages, submitting],
  );

  const toggle = (set: Set<string>, code: string, update: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    update(next);
  };

  const submit = async () => {
    if (!viewerEmail || !canSubmit) return;
    setSubmitting(true);
    setFlash(null);
    try {
      const res = await fetch("/api/tfc/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantEmail: viewerEmail,
          languages: Array.from(languages),
          domains: Array.from(domains),
          motivation: motivation.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setFlash(data?.error || "Submission failed");
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setFlash("Network error");
      setSubmitting(false);
    }
  };

  return (
    <FeedLayout>
      <div
        style={{
          height: viewportHeight ? `${viewportHeight}px` : "100dvh",
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
            fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 700,
            fontSize: 48,
            letterSpacing: 3,
            color: "white",
            margin: "0 0 4px",
            lineHeight: 1,
          }}
        >
          TFC CREW
        </h1>
        <p
          style={{
            fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,0.6)",
            margin: "0 0 22px",
          }}
        >
          Apply to fact-check TRANCHE moments.
        </p>

        {!authResolved ? (
          <Stub>LOADING…</Stub>
        ) : !viewerEmail ? (
          <Card>
            <Heading>SIGN IN REQUIRED</Heading>
            <Body>You need an account to apply for the TFC Crew.</Body>
          </Card>
        ) : existingStatus && existingStatus !== "none" ? (
          <Card>
            <Heading>{statusHeading(existingStatus)}</Heading>
            <Body>{statusBody(existingStatus)}</Body>
            <button
              onClick={() => router.push("/tranche")}
              style={ghostButtonStyle}
            >
              Back to TRANCHE
            </button>
          </Card>
        ) : done ? (
          <Card>
            <Heading>APPLICATION SUBMITTED</Heading>
            <Body>
              Thanks — we'll review your application and notify you when a decision is made.
              You can track status from your profile.
            </Body>
            <button
              onClick={() => router.push("/tranche")}
              style={primaryButtonStyle}
            >
              Back to TRANCHE
            </button>
          </Card>
        ) : (
          <Card>
            <Section>
              <Label>WHY YOU?</Label>
              <Hint>30+ characters. Tell us why you'd be a strong fact-checker.</Hint>
              <textarea
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                placeholder="I've worked on…"
                rows={5}
                style={textareaStyle}
              />
              <Counter
                count={motivation.trim().length}
                ok={motivation.trim().length >= 30}
              />
            </Section>

            <Section>
              <Label>LANGUAGES</Label>
              <Hint>Pick the languages you can fact-check in.</Hint>
              <ChipGrid>
                {LANGUAGES.map((l) => (
                  <Chip
                    key={l.code}
                    active={languages.has(l.code)}
                    onClick={() => toggle(languages, l.code, setLanguages)}
                  >
                    {l.label}
                  </Chip>
                ))}
              </ChipGrid>
            </Section>

            <Section>
              <Label>DOMAINS</Label>
              <Hint>Optional. Where do you have real expertise?</Hint>
              <ChipGrid>
                {DOMAINS.map((d) => (
                  <Chip
                    key={d.code}
                    active={domains.has(d.code)}
                    onClick={() => toggle(domains, d.code, setDomains)}
                  >
                    {d.label}
                  </Chip>
                ))}
              </ChipGrid>
            </Section>

            <button
              onClick={submit}
              disabled={!canSubmit}
              style={{
                ...primaryButtonStyle,
                opacity: canSubmit ? 1 : 0.45,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              {submitting ? "SUBMITTING…" : "SUBMIT APPLICATION"}
            </button>

            {flash && (
              <div
                style={{
                  marginTop: 12,
                  fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: 12,
                  color: ROSE,
                  textAlign: "center",
                }}
              >
                {flash}
              </div>
            )}
          </Card>
        )}
      </div>
    </FeedLayout>
  );
}

function statusHeading(s: ExistingStatus): string {
  switch (s) {
    case "pending":
      return "APPLICATION PENDING";
    case "active":
    case "professional":
      return "YOU'RE ON THE CREW";
    case "expired":
      return "TERM EXPIRED";
    case "suspended":
      return "SUSPENDED";
    default:
      return "";
  }
}

function statusBody(s: ExistingStatus): string {
  switch (s) {
    case "pending":
      return "Your application is in review. We'll notify you when a decision is made.";
    case "active":
      return "You're an active TFC Crew member. Your term is running.";
    case "professional":
      return "You're a verified professional TFC member.";
    case "expired":
      return "Your TFC term has expired. You can re-apply.";
    case "suspended":
      return "Your TFC membership is currently suspended. Contact support.";
    default:
      return "";
  }
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: PASCAL_MID,
        borderRadius: 14,
        padding: "22px 20px",
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: INK,
        boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 8px 28px rgba(0,0,0,0.18)",
      }}
    >
      {children}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 13,
        letterSpacing: "0.2em",
        fontWeight: 700,
        color: SLATE,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 14, lineHeight: 1.55, color: INK_SOFT, margin: "0 0 16px" }}>
      {children}
    </p>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 18 }}>{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 10,
        letterSpacing: "0.24em",
        fontWeight: 700,
        color: SLATE,
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, color: INK_MUTE, marginBottom: 8 }}>{children}</div>
  );
}

function Stub({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 10,
        letterSpacing: "0.2em",
        color: "rgba(255,255,255,0.6)",
        textAlign: "center",
        padding: 40,
      }}
    >
      {children}
    </div>
  );
}

function ChipGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? INK : "rgba(15,17,21,0.18)"}`,
        background: active ? INK : PASCAL_LOW,
        color: active ? PASCAL_MID : INK_SOFT,
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}

function Counter({ count, ok }: { count: number; ok: boolean }) {
  return (
    <div
      style={{
        marginTop: 6,
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 10,
        letterSpacing: "0.15em",
        color: ok ? SLATE : ROSE,
      }}
    >
      {count} CHARS {ok ? "✓" : `· need ${Math.max(0, 30 - count)} more`}
    </div>
  );
}

const textareaStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  background: PASCAL_HIGH,
  border: `1px solid rgba(15,17,21,0.12)`,
  borderRadius: 10,
  color: INK,
  fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: 14,
  lineHeight: 1.5,
  outline: "none",
  resize: "vertical",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 4,
  padding: "13px",
  borderRadius: 12,
  background: INK,
  color: PASCAL_MID,
  border: "none",
  fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.24em",
};

const ghostButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: "transparent",
  border: `1px solid rgba(15,17,21,0.15)`,
  color: SLATE,
  cursor: "pointer",
};
