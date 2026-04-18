import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { surface, eventName, userEmail, postId, creatorEmail, properties } =
      await req.json();

    await prisma.analyticsEvent.create({
      data: {
        surface,
        eventName,
        userEmail: userEmail ?? null,
        postId: postId ?? null,
        creatorEmail: creatorEmail ?? null,
        properties: properties ?? {},
      },
    });

    if (eventName === "post_view" && postId) {
      await prisma.postView.create({
        data: { postId, userEmail: userEmail ?? null },
      });
    }

    if (eventName === "post_share" && postId) {
      await prisma.postShare.create({
        data: { postId, userEmail: userEmail ?? null },
      });
    }
  } catch (err) {
    console.error("analytics/event error", err);
  }

  return NextResponse.json({ ok: true });
}
