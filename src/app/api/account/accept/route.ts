import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailFromCreatorMe } from "@/lib/authedEmail";
import { TERMS_VERSION } from "@/legal/terms.en";
import { PRIVACY_VERSION } from "@/legal/privacy.en";

export async function POST(req: Request) {
  const email = await getAuthedEmailFromCreatorMe(req);
  if (!email) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const what = String(body?.what ?? "");

  const now = new Date();

  if (what === "terms") {
    await prisma.accountState.upsert({
      where: { email },
      create: { email, termsVersion: TERMS_VERSION, termsAcceptedAt: now },
      update: { termsVersion: TERMS_VERSION, termsAcceptedAt: now },
    });
    await prisma.accountEvent.create({ data: { email, type: "ACCEPT_TERMS", metadata: { version: TERMS_VERSION } as any } });
    return NextResponse.json({ ok: true, version: TERMS_VERSION });
  }

  if (what === "privacy") {
    await prisma.accountState.upsert({
      where: { email },
      create: { email, privacyVersion: PRIVACY_VERSION, privacyAcceptedAt: now },
      update: { privacyVersion: PRIVACY_VERSION, privacyAcceptedAt: now },
    });
    await prisma.accountEvent.create({ data: { email, type: "ACCEPT_PRIVACY", metadata: { version: PRIVACY_VERSION } as any } });
    return NextResponse.json({ ok: true, version: PRIVACY_VERSION });
  }

  return NextResponse.json({ error: "Invalid 'what' (terms|privacy)." }, { status: 400 });
}
