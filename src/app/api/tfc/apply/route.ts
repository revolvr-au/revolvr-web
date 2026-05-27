export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const applicantEmail = String(body?.applicantEmail ?? "").trim().toLowerCase();
    const languages = Array.isArray(body?.languages)
      ? (body.languages as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
      : [];
    const domains = Array.isArray(body?.domains)
      ? (body.domains as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
      : [];
    const motivation = typeof body?.motivation === "string" ? body.motivation.trim() : "";

    if (!applicantEmail) {
      return NextResponse.json(
        { ok: false, error: "applicantEmail required" },
        { status: 400 },
      );
    }
    if (!motivation) {
      return NextResponse.json(
        { ok: false, error: "motivation required" },
        { status: 400 },
      );
    }

    const profile = await prisma.creatorProfile.findUnique({
      where: { email: applicantEmail },
      select: { email: true },
    });
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "no creator profile for this email" },
        { status: 404 },
      );
    }

    const existing = await prisma.tFCMember.findUnique({
      where: { userEmail: applicantEmail },
      select: { id: true, status: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: "already a TFC member or pending application",
          status: existing.status,
        },
        { status: 409 },
      );
    }

    const member = await prisma.tFCMember.create({
      data: {
        userEmail: applicantEmail,
        status: "PENDING",
        languages: languages.length > 0 ? languages : ["en"],
        domains,
        motivation,
      },
    });

    return NextResponse.json({ ok: true, applicationId: member.id });
  } catch (error) {
    console.error("🔥 POST /api/tfc/apply ERROR:", error);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
