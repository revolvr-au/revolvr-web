/**
 * Engineers the first real TRANCHE breakout by hitting POST /api/tranche/volt-comment
 * with synthetic seed actor emails until the comment crosses the threshold
 * (>= 200V absolute AND >= 15% of parent post voltage).
 *
 * Target (Reallistr, self-comment):
 *   post     654294f3-f815-4878-9799-3f60cbf220be   "REALLISTR REAL ESTATE is live"   voltage 100
 *   comment  230851cb-2f92-456b-9b02-14c78019ed0b   "This looks sick mate…💪"          voltage 0
 *
 * At comment.voltage = 200, share = 200/100 = 2.0 ≫ 0.15  → tranches.
 *
 * Side effects on prod:
 *   - 200 CommentVoltageEvent rows with actorEmail seed-001..200@revolvr.au
 *   - Comment.voltage 0 → 200, tranched=true, tranchedAt=now, quietPeriodEndsAt=now+90s
 *   - 1 TrancheEvent row
 *   - 2 TrancheNotification rows (both to westley@reallistr.com.au — author == creator)
 *   - 200 CreatorVoltageEvent rows + creatorProfile.voltage += 400 for westley@reallistr.com.au
 *     (comment_volted = 2 pts × 200 actors)
 *
 * Loop stops early as soon as the endpoint reports tranched:true.
 */

const ENDPOINT = process.env.TRANCHE_ENDPOINT ?? "http://localhost:3000/api/tranche/volt-comment";
const COMMENT_ID = "230851cb-2f92-456b-9b02-14c78019ed0b";
const MAX_ACTORS = 220; // 200 needed + a small safety buffer
const ACTOR_EMAIL = (i: number) => `seed-${String(i).padStart(3, "0")}@revolvr.au`;

type Resp = {
  ok: boolean;
  voted?: boolean;
  newVoltage?: number;
  tranched?: boolean;
  trancheEventId?: string;
  duplicate?: boolean;
  error?: string;
};

async function castVolt(actorEmail: string): Promise<Resp> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorEmail, commentId: COMMENT_ID }),
  });
  return (await res.json()) as Resp;
}

async function main() {
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Comment:  ${COMMENT_ID}`);
  console.log(`Casting up to ${MAX_ACTORS} synthetic volts...\n`);

  const start = Date.now();
  let lastVoltage = 0;
  let trancheEventId: string | undefined;

  for (let i = 1; i <= MAX_ACTORS; i++) {
    const actorEmail = ACTOR_EMAIL(i);
    let r: Resp;
    try {
      r = await castVolt(actorEmail);
    } catch (e: any) {
      console.error(`#${i} ${actorEmail}  network error: ${e?.message}`);
      continue;
    }

    if (!r.ok) {
      console.error(`#${i} ${actorEmail}  endpoint error: ${r.error}`);
      continue;
    }

    lastVoltage = r.newVoltage ?? lastVoltage;
    const dup = r.duplicate ? "  (duplicate)" : "";
    const tag = r.tranched ? "  ⚡ TRANCHED" : "";

    if (i % 20 === 0 || r.tranched || i <= 5) {
      console.log(`#${String(i).padStart(3, "0")}  voltage=${lastVoltage}${dup}${tag}`);
    }

    if (r.tranched) {
      trancheEventId = r.trancheEventId;
      console.log(`\nBreakout reached at vote #${i}.`);
      break;
    }
  }

  const ms = Date.now() - start;
  console.log(`\nDone. Final comment voltage: ${lastVoltage}`);
  console.log(`TrancheEvent id: ${trancheEventId ?? "(not tranched — check thresholds)"}`);
  console.log(`Elapsed: ${ms}ms`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
