import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailFromCreatorMe } from "@/lib/authedEmail";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const category = String(body?.category ?? "").slice(0, 64);
  const link = String(body?.link ?? "").slice(0, 500) || null;
  const details = String(body?.details ?? "").slice(0, 4000) || null;

  if (!category) return NextResponse.json({ error: "Category required." }, { status: 400 });

  const reporterEmail = (await getAuthedEmailFromCreatorMe(req)) ?? null;

  const row = await prisma.safetyReport.create({
    data: {
      reporterEmail,
      category,
      link,
      details,
    },
  });

  if (reporterEmail) {
    await prisma.accountEvent.create({
      data: { email: reporterEmail, type: "REPORT_SUBMITTED", reason: category, metadata: { reportId: row.id } as any },
    });
  }

  return NextResponse.json({ ok: true, id: row.id });
}
