export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOriginalVariants } from "@/lib/trancheOriginals";

const MAX_BODY_LENGTH = 500;

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const userEmail = String(json?.userEmail ?? "").trim().toLowerCase();
    const body = String(json?.body ?? "").trim();
    const language = String(json?.language ?? "en").trim() || "en";

    if (!userEmail.includes("@") || !body) {
      return NextResponse.json(
        { ok: false, error: "invalid_input" },
        { status: 400 },
      );
    }
    if (body.length > MAX_BODY_LENGTH) {
      return NextResponse.json(
        { ok: false, error: "body_too_long" },
        { status: 400 },
      );
    }

    // Only creators (CreatorProfile) can publish Originals.
    const creator = await prisma.creatorProfile.findUnique({
      where: { email: userEmail },
      select: { email: true },
    });
    if (!creator) {
      return NextResponse.json(
        { ok: false, error: "not_a_creator" },
        { status: 403 },
      );
    }

    // Generate rotating hook variants (original + up to 3). Never blocks creation:
    // the helper falls back to [body] if the AI is unavailable.
    const originalVariants = await generateOriginalVariants(body, language);

    const post = await prisma.post.create({
      data: {
        userEmail,
        caption: body,
        imageUrl: "",
        postType: "TRANCHE_ORIGINAL",
        originalVariants,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, postId: post.id });
  } catch (err: any) {
    console.error("tranche/originals/create error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}
