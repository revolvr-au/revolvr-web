import Link from "next/link";

export const dynamic = "force-dynamic";

export default function TrancheRulesPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#FFFFFF",
        color: "#0A0A0A",
        padding:
          "calc(env(safe-area-inset-top, 0px) + 28px) 22px calc(env(safe-area-inset-bottom, 0px) + 28px)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Bebas+Neue&family=Space+Grotesk:wght@500;600;700&display=swap');
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link
          href="/tranche"
          style={{
            display: "inline-block",
            fontSize: 12,
            color: "rgba(0,0,0,0.55)",
            textDecoration: "none",
            letterSpacing: "0.08em",
            marginBottom: 18,
          }}
        >
          ← TRANCHE
        </Link>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(48px, 10vw, 84px)",
            letterSpacing: "0.04em",
            margin: 0,
            lineHeight: 0.95,
            color: "#0A0A0A",
          }}
        >
          SIN BIN RULES
        </h1>
        <p
          style={{
            marginTop: 8,
            fontSize: 13,
            color: "rgba(0,0,0,0.55)",
            letterSpacing: "0.04em",
          }}
        >
          What happens when a TRANCHE moment is flagged by the TFC Crew.
        </p>

        <Section title="In plain language">
          <p>
            The Sin Bin is what happens to a TRANCHE moment after a TFC fact
            check returns a verdict of <b>FALSE</b> or <b>MISLEADING</b>. The
            penalty is escalating — first the moment is flagged, then it is
            temporarily removed, and finally a third strike makes the removal
            permanent.
          </p>
          <p>
            You are not banned, your account is not deleted, and your other
            moments are unaffected. The sin bin applies to a single TRANCHE
            moment at a time.
          </p>
        </Section>

        <Level
          tag="LEVEL 1"
          tagColor="#C58A1A"
          title="10 minute amber flag"
          body={
            <>
              <p>
                Your moment is publicly flagged with an amber marker, but it
                stays in the feed. Readers see the flag and the TFC verdict
                inline so they can judge for themselves.
              </p>
              <p>
                <b>Trigger</b>: a TFC fact check verdict of <b>MISLEADING</b>{" "}
                with a confirmed source. One verdict is enough to enter Level 1.
              </p>
              <p>
                <b>Duration</b>: 10 minutes from the verdict timestamp. After
                that, the flag stays on the moment as historical context but the
                sin bin status clears.
              </p>
            </>
          }
        />

        <Level
          tag="LEVEL 2"
          tagColor="#B85C5C"
          title="30 minutes — temporarily removed"
          body={
            <>
              <p>
                Your moment is removed from the live feed for 30 minutes. It is
                not deleted — it returns automatically once the timer ends, with
                the verdict attached.
              </p>
              <p>
                <b>Trigger</b>: either a second TFC fact check verdict against
                the same moment (escalating from Level 1), or a single{" "}
                <b>FALSE</b> verdict from a TFC member with PROFESSIONAL status.
              </p>
              <p>
                <b>Duration</b>: 30 minutes. During the temporary removal, the
                moment URL still resolves and shows the sin bin notice and the
                verdict, so the audience can see why it was paused.
              </p>
            </>
          }
        />

        <Level
          tag="LEVEL 3"
          tagColor="#0A0A0A"
          title="Permanent strike"
          body={
            <>
              <p>
                Your moment is removed permanently. A platform-wide
                notification fires so witnesses, replyers, and followers know
                the moment was struck out, and the moment is archived with the
                verdict for transparency.
              </p>
              <p>
                <b>Trigger</b>: a third TFC fact check verdict against the same
                moment, or a single FALSE verdict that is upheld by a panel
                review. Verdicts of FALSE that contain documented harm
                (defamation, targeted harassment, or platform policy breach)
                can go straight to Level 3 without escalation.
              </p>
              <p>
                <b>Effect on your account</b>: a strike is recorded against
                your TRANCHE eligibility. Three strikes in a rolling 90 day
                window suspends your ability to start new TRANCHE moments.
                Witnesses on the struck moment also take an accuracy hit.
              </p>
            </>
          }
        />

        <Section title="How to contest a decision">
          <p>
            You can request a panel review of any Level 1, Level 2, or Level 3
            verdict within 48 hours of the sin bin entry. Open the moment, tap
            the sin bin badge, and choose <b>Contest verdict</b>. The request
            goes to a panel of three TFC members who have not previously
            reviewed the moment.
          </p>
          <ul>
            <li>
              A successful contest lifts the sin bin status and restores the
              moment to the feed. For Level 3, the platform-wide notification
              of removal is followed by a notification of reinstatement.
            </li>
            <li>
              An unsuccessful contest leaves the sin bin in place and adds the
              panel verdict as additional context on the moment.
            </li>
            <li>
              Frivolous or repeated unsuccessful contests can themselves count
              toward your TRANCHE strike total.
            </li>
          </ul>
          <p>
            Contests are usually resolved within 24 hours. While a contest is
            open, the moment shows a contested marker.
          </p>
        </Section>

        <div
          style={{
            marginTop: 40,
            paddingTop: 18,
            borderTop: "1px solid rgba(0,0,0,0.08)",
            fontSize: 12,
            color: "rgba(0,0,0,0.5)",
          }}
        >
          Read the full{" "}
          <Link
            href="/tranche/terms"
            style={{ color: "rgba(0,0,0,0.65)", textDecoration: "underline" }}
          >
            TRANCHE Terms
          </Link>{" "}
          for the legal framing, or{" "}
          <Link
            href="/legal/guidelines"
            style={{ color: "rgba(0,0,0,0.65)", textDecoration: "underline" }}
          >
            Community Guidelines
          </Link>{" "}
          for platform-wide standards.
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 30 }}>
      <h2
        style={{
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontSize: 13,
          letterSpacing: "0.18em",
          margin: "0 0 10px",
          color: "#0A0A0A",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.65,
          color: "rgba(0,0,0,0.78)",
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Level({
  tag,
  tagColor,
  title,
  body,
}: {
  tag: string;
  tagColor: string;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 30 }}>
      <div
        style={{
          display: "inline-block",
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontSize: 11,
          letterSpacing: "0.22em",
          fontWeight: 700,
          color: "#FFFFFF",
          background: tagColor,
          padding: "4px 10px",
          borderRadius: 4,
          marginBottom: 10,
        }}
      >
        {tag}
      </div>
      <h2
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 8px",
          color: "#0A0A0A",
          lineHeight: 1.25,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.65,
          color: "rgba(0,0,0,0.78)",
        }}
      >
        {body}
      </div>
    </section>
  );
}
