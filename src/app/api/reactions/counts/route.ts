import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const REACTIONS = ["🔥", "❤️", "👏", "😂", "😮"] as const;
type Reaction = (typeof REACTIONS)[number];

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function emptyCounts(): Record<Reaction, number> {
  return { "🔥": 0, "❤️": 0, "👏": 0, "😂": 0, "😮": 0 };
}

export async function GET(req: NextRequest) {
  try {
    if (process.env.PAID_REACTIONS_ENABLED !== "true") {
      return NextResponse.json({ error: "Disabled" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const postId = (searchParams.get("postId") ?? "").trim();

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    // Pull all REACTION rows for this post, then bucket by emoji suffix.
    // We intentionally ignore legacy rows (targetId === postId or missing ::)
    const rows = await prisma.supportLedger.findMany({
      where: {
        kind: "REACTION",
        targetId: { startsWith: `${postId}::` },
      },
      select: { targetId: true, units: true },
    });

    const counts = emptyCounts();

    for (const r of rows) {
  const targetId = typeof r.targetId === "string" ? r.targetId : "";
  if (!targetId) continue;

  const parts = targetId.split("::");
  if (parts.length < 2) continue;

  const emojiRaw = parts[1];
  const emoji = emojiRaw as Reaction | undefined;
  if (!emoji) continue;
  if (!REACTIONS.includes(emoji)) continue;

  // ...
}


    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return NextResponse.json({ postId, counts, total }, { status: 200 });
  } catch (e: unknown) {
    console.error("[reactions/counts] error", e);
    return NextResponse.json(
      { error: "Internal error", detail: errorMessage(e) },
      { status: 500 }
    );
  }
}
