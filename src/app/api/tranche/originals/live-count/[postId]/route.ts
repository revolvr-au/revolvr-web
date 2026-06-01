export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

// Simple in-memory presence: per post, a map of viewerKey -> lastSeen (ms).
// A viewer counts as "live" for 30s after their most recent fetch. This is a
// best-effort, single-instance approximation — fine for now, not durable.
const VIEWER_TTL_MS = 30_000;

type PresenceStore = Map<string, Map<string, number>>;

const globalForPresence = globalThis as unknown as {
  __originalsPresence?: PresenceStore;
};
const store: PresenceStore =
  globalForPresence.__originalsPresence ?? new Map();
if (!globalForPresence.__originalsPresence) {
  globalForPresence.__originalsPresence = store;
}

function countLive(postId: string, viewerKey: string, now: number): number {
  let viewers = store.get(postId);
  if (!viewers) {
    viewers = new Map();
    store.set(postId, viewers);
  }
  // Refresh / register this viewer.
  viewers.set(viewerKey, now);
  // Prune expired viewers.
  for (const [key, lastSeen] of viewers) {
    if (now - lastSeen > VIEWER_TTL_MS) viewers.delete(key);
  }
  if (viewers.size === 0) store.delete(postId);
  return viewers.size;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ postId: string }> },
) {
  try {
    const { postId } = await ctx.params;
    if (!postId) {
      return NextResponse.json(
        { ok: false, error: "missing_post_id" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    // A stable per-session id keeps the same viewer from being double-counted
    // across polls. Fall back to a coarse network key if none is supplied.
    const viewerKey =
      searchParams.get("viewerId")?.trim() ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "anon";

    const now = Date.now();
    const count = countLive(postId, viewerKey, now);

    return NextResponse.json({ ok: true, count });
  } catch (err: any) {
    console.error("tranche/originals/live-count error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}
