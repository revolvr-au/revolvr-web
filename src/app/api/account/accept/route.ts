import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailFromCreatorMe } from "@/lib/authedEmail";
import { TERMS_VERSION } from "@/legal/terms.en";
import { PRIVACY_VERSION } from "@/legal/privacy.en";

export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const email = await getAuthedEmailFromCreatorMe(req);
    if (!email) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const what = String(body?.what ?? "");
    const now = new Date();

    if (what === "terms") {
      await prisma.creatorProfile.upsert({
        where: { email },
        create: {
          email,
          displayName: String(email).split("@")[0] || email,
          creatorTermsAccepted: true,
          creatorTermsAcceptedAt: now,
          creatorTermsVersion: TERMS_VERSION,
        },
        update: {
          creatorTermsAccepted: true,
          creatorTermsAcceptedAt: now,
          creatorTermsVersion: TERMS_VERSION,
        },
      });
      return NextResponse.json({ ok: true, version: TERMS_VERSION });
    }

    if (what === "privacy") {
      return NextResponse.json({ ok: true, version: PRIVACY_VERSION });
    }

    return NextResponse.json({ error: "Invalid 'what' (terms|privacy)." }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/account/accept error:", err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
