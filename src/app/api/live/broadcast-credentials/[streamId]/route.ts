import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { normalizeEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hands the IVS ingest credentials for one broadcast to its owner and nobody else.
 * These used to ride in the page URL as ?key=...&ingest=..., which leaked a live
 * credential into history, referrers and logs.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ streamId: string }> }
) {
  // Next 16: params is a Promise.
  const { streamId } = await params;
  if (!streamId) {
    return NextResponse.json({ error: "streamId required" }, { status: 400 });
  }

  const email = await getAuthedEmailOrNull();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [broadcast, post] = await Promise.all([
    prisma.ivsBroadcast.findUnique({
      where: { postId: streamId },
      select: { creatorEmail: true, streamKey: true, ingestEndpoint: true },
    }),
    prisma.post.findUnique({
      where: { id: streamId },
      select: { userEmail: true, postType: true, liveEndedAt: true, deletedAt: true },
    }),
  ]);

  if (!broadcast || !post || post.postType !== "LIVE") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Ownership is checked against both rows so neither alone can authorise a read.
  const caller = normalizeEmail(email);
  const owner = normalizeEmail(broadcast.creatorEmail);
  if (caller !== owner || caller !== normalizeEmail(post.userEmail ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // A finished or deleted stream has no business handing out ingest credentials.
  if (post.liveEndedAt || post.deletedAt) {
    return NextResponse.json({ error: "Stream is not live" }, { status: 409 });
  }

  return NextResponse.json(
    { streamKey: broadcast.streamKey, ingestEndpoint: broadcast.ingestEndpoint },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
