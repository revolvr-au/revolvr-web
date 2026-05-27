import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { surface, eventName, userEmail, postId, creatorEmail, properties } =
    await req.json();

  // Fire DB writes in the background — don't block the 200 response.
  // The client never reads the body so there's no value in awaiting.
  void (async () => {
    try {
      const writes: Promise<unknown>[] = [
        prisma.analyticsEvent.create({
          data: {
            surface,
            eventName,
            userEmail: userEmail ?? null,
            postId: postId ?? null,
            creatorEmail: creatorEmail ?? null,
            properties: properties ?? {},
          },
        }),
      ];

      if (eventName === "post_view" && postId) {
        writes.push(prisma.postView.create({ data: { postId, userEmail: userEmail ?? null } }));
      }
      if (eventName === "post_share" && postId) {
        writes.push(prisma.postShare.create({ data: { postId, userEmail: userEmail ?? null } }));
      }

      await Promise.all(writes);
    } catch (err) {
      console.error("analytics/event error", err);
    }
  })();

  return NextResponse.json({ ok: true });
}
