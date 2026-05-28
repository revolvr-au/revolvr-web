import Link from "next/link";

export const dynamic = "force-dynamic";

export default function TrancheLandingPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#FFFFFF",
        color: "#0A0A0A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding:
          "calc(env(safe-area-inset-top, 0px) + 24px) 20px calc(env(safe-area-inset-bottom, 0px) + 20px)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Bebas+Neue&display=swap');
      `}</style>

      <div style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(72px, 18vw, 128px)",
            letterSpacing: "0.06em",
            color: "#0A0A0A",
            margin: 0,
            lineHeight: 0.9,
          }}
        >
          TRANCHE
        </h1>

        <p
          style={{
            marginTop: 14,
            fontSize: 16,
            fontWeight: 500,
            color: "#0A0A0A",
            letterSpacing: "0.02em",
          }}
        >
          Comments that broke out.
        </p>

        <div
          style={{
            marginTop: 28,
            fontSize: 14,
            lineHeight: 1.6,
            color: "rgba(0,0,0,0.7)",
          }}
        >
          <p style={{ margin: "0 0 6px" }}>
            When a comment&apos;s voltage eclipses the post it sits on, it
            breaks out.
          </p>
          <p style={{ margin: "0 0 6px" }}>
            Witnesses, fact checkers, and originators stake into it.
          </p>
          <p style={{ margin: 0 }}>
            The comment becomes the moment. The moment becomes the room.
          </p>
        </div>

        <div
          style={{
            marginTop: 36,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <Link
            href="/welcome?redirectTo=%2Ftranche"
            style={{
              display: "block",
              background: "#0A0A0A",
              color: "#FFFFFF",
              textDecoration: "none",
              borderRadius: 8,
              padding: "14px 18px",
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.2em",
            }}
          >
            CREATE ACCOUNT
          </Link>
          <Link
            href="/welcome?redirectTo=%2Ftranche"
            style={{
              display: "block",
              background: "#FFFFFF",
              color: "#0A0A0A",
              border: "1px solid rgba(0,0,0,0.18)",
              textDecoration: "none",
              borderRadius: 8,
              padding: "14px 18px",
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.2em",
            }}
          >
            SIGN IN
          </Link>
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 11,
            color: "rgba(0,0,0,0.45)",
            letterSpacing: "0.06em",
          }}
        >
          By continuing you agree to the{" "}
          <Link
            href="/tranche/terms"
            style={{
              color: "rgba(0,0,0,0.55)",
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            TRANCHE Terms
          </Link>
          .
        </div>
      </div>
    </main>
  );
}
