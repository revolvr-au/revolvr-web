import Link from "next/link";

export const dynamic = "force-dynamic";

export default function TrancheTermsPage() {
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Bebas+Neue&display=swap');
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link
          href="/tranche/landing"
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
          TRANCHE TERMS
        </h1>
        <p
          style={{
            marginTop: 8,
            fontSize: 13,
            color: "rgba(0,0,0,0.55)",
            letterSpacing: "0.04em",
          }}
        >
          The rules of the breakout. Last revised 2026-05-28.
        </p>

        <Section title="1. The breakout mechanic">
          <p>
            A comment becomes a TRANCHE moment when its voltage crosses two
            independent thresholds against the post it sits under: an absolute
            voltage floor and a relative share of the host post&apos;s voltage.
            Until both thresholds are met, the comment is a comment. Once both
            are met, it breaks out and is published into the TRANCHE feed for
            the audience to witness, fact-check, and seed.
          </p>
          <p>
            Voltage accrues from human attention — votes, replies, witnesses,
            and time-decayed reactions. Bots, coordinated farming, and self
            voting are removed from the score. Sin-bin penalties apply where
            abuse is detected.
          </p>
          <p>
            A breakout is non-revertible: once the moment exists, removing it
            requires a strike (see §4 platform rules). The voltage history of
            the moment is preserved for transparency.
          </p>
        </Section>

        <Section title="2. WITNESS rules">
          <p>
            A WITNESS endorses that a TRANCHE moment is real, not coordinated,
            and worth the audience&apos;s attention. Witnesses are publicly
            attached to the moment and can be challenged.
          </p>
          <ul>
            <li>One witness per moment per account.</li>
            <li>
              A quiet period applies after witnessing a moment from the same
              creator&apos;s network — no rapid stacking.
            </li>
            <li>
              Witnesses on a moment that is later STRUCK_OUT lose accuracy
              standing; persistent bad witnessing leads to suspension.
            </li>
            <li>
              Early witnesses (in the first minute after breakout) carry more
              weight in the audience-trust score but also more responsibility.
            </li>
          </ul>
        </Section>

        <Section title="3. TFC Crew obligations and sin bin">
          <p>
            The TRANCHE Fact-Check Crew (TFC) is an opt-in pool of vetted
            members who can file checks against the claim inside a TRANCHE
            moment. Filing a check is a public, attributable act.
          </p>
          <ul>
            <li>
              <b>Verdicts</b>: TRUE, FALSE, MISLEADING, UNVERIFIABLE, SATIRE.
              Each check must include sources for any verdict other than
              UNVERIFIABLE or SATIRE.
            </li>
            <li>
              <b>Sin bin</b>: A TFC member whose check is overturned in a
              panel review enters the sin bin for an escalating duration
              (10 minutes for the first overturn, 30 for the second, longer
              after that). During sin bin, the member cannot file new checks.
            </li>
            <li>
              <b>Term</b>: Each TFC term lasts for the duration shown in your
              profile. Accuracy below the threshold at term end means the term
              is not renewed.
            </li>
            <li>
              Professional TFC members (verified journalists, fact-check
              organisations) are flagged as PROFESSIONAL and their checks
              carry higher initial weight in the consensus.
            </li>
          </ul>
        </Section>

        <Section title="4. Originator Economy revenue split">
          <p>
            When a TRANCHE moment is monetised — via sponsored placement, a
            seeded GATH that generates spark spend, or any platform-issued
            revenue tied to the moment — the proceeds are split between the
            people who created it.
          </p>
          <ul>
            <li>
              <b>Commenter (author of the moment)</b>: receives the largest
              share, as the originator of the breakout.
            </li>
            <li>
              <b>Post creator (host of the comment)</b>: receives a meaningful
              share for hosting the conversation that produced the moment.
            </li>
            <li>
              <b>Witness pool</b>: a smaller share is distributed pro-rata to
              early witnesses, weighted by how soon after breakout they staked
              in.
            </li>
            <li>
              <b>Platform</b>: takes the remaining share to cover
              infrastructure, moderation, and the TFC programme.
            </li>
          </ul>
          <p>
            Exact percentages are visible in your earnings dashboard and may be
            adjusted with notice. Payouts are settled per the standard Revolvr
            payout schedule and are subject to the platform-wide payout terms.
          </p>
        </Section>

        <Section title="5. Platform rules for TRANCHE content">
          <p>
            TRANCHE is a public, attributable feed. Content posted to it is
            held to the platform&apos;s content standards plus an additional
            standard for accuracy and good-faith engagement.
          </p>
          <ul>
            <li>
              No targeted harassment, slurs, doxxing, or threats. Strikes are
              immediate.
            </li>
            <li>
              No coordinated voltage farming, vote rings, or sockpuppeting.
              Detection is automatic and continuous.
            </li>
            <li>
              No deceptive media (deepfakes presented as real) without a clear
              context label. Satire is allowed when marked.
            </li>
            <li>
              Repeated MISLEADING or FALSE verdicts on your moments will lower
              your TRANCHE eligibility threshold and may suspend it.
            </li>
            <li>
              Reply media (GIF, image, video) is subject to the same standards
              and a 30-second cap on video.
            </li>
          </ul>
        </Section>

        <Section title="6. Changes">
          <p>
            We may update these terms as the breakout mechanic, TFC programme,
            and Originator Economy evolve. Material changes will be announced
            in-product and dated above.
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
          Questions? Reach the team via the in-app support channel.
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
