import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authed spark balance for the current viewer.
 *
 * Email is derived server-side from the session cookie — never read from a query
 * param — so this can't be used to read someone else's balance.
 *
 * Optional ?session_id=cs_... reports whether that specific checkout session has
 * been fulfilled yet, which is how /spark/success knows the async webhook has
 * actually landed instead of guessing from the URL. The receipt lookup is scoped
 * to the viewer's own email, so a guessed session id reveals nothing.
 */
export async function GET(req: NextRequest) {
  const authedEmail = await getAuthedEmailOrNull();
  if (!authedEmail) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const email = authedEmail.trim().toLowerCase();

  const sessionId = req.nextUrl.searchParams.get("session_id");

  const [credits, receipt] = await Promise.all([
    prisma.userCredits.findUnique({
      where: { email },
      select: { sparks: true },
    }),
    sessionId
      ? prisma.stripeCheckoutReceipt.findFirst({
          where: { sessionId, customerEmail: email },
          select: { metadata: true },
        })
      : Promise.resolve(null),
  ]);

  const meta = (receipt?.metadata ?? null) as { sparks?: unknown } | null;
  const credited = typeof meta?.sparks === "number" ? meta.sparks : null;

  return NextResponse.json(
    {
      sparks: credits?.sparks ?? 0,
      fulfilled: Boolean(receipt),
      credited,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
