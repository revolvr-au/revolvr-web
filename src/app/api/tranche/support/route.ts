export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const SUPPORT_INBOX = "revolvrassist@gmail.com";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const company = body?.company ? String(body.company).trim() : null;
    const email = String(body?.email ?? "").trim().toLowerCase();
    const message = String(body?.message ?? "").trim();
    const type = String(body?.type ?? "general").trim() || "general";

    if (!name || !email.includes("@") || !message) {
      return NextResponse.json(
        { ok: false, error: "invalid_input" },
        { status: 400 },
      );
    }

    if (name.length > 200 || message.length > 5000 || (company && company.length > 200)) {
      return NextResponse.json(
        { ok: false, error: "too_long" },
        { status: 400 },
      );
    }

    const record = await prisma.trancheSupportRequest.create({
      data: { name, company: company || null, email, message, type },
    });

    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM ?? "Revolvr Support <support@revolvr.au>";

    if (apiKey) {
      const subject =
        type === "tfc"
          ? `[TFC Professional] ${name}${company ? ` — ${company}` : ""}`
          : `[Business Support] ${name}${company ? ` — ${company}` : ""}`;

      const text = [
        `Type: ${type}`,
        `Name: ${name}`,
        company ? `Company: ${company}` : null,
        `Email: ${email}`,
        "",
        "Message:",
        message,
        "",
        `Record ID: ${record.id}`,
      ]
        .filter(Boolean)
        .join("\n");

      try {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: fromAddress,
          to: SUPPORT_INBOX,
          replyTo: email,
          subject,
          text,
        });
        await prisma.trancheSupportRequest.update({
          where: { id: record.id },
          data: { delivered: true },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "send_failed";
        await prisma.trancheSupportRequest.update({
          where: { id: record.id },
          data: { deliveryError: msg.slice(0, 500) },
        });
        // Do not fail the request — submission is persisted.
      }
    }

    return NextResponse.json({ ok: true, id: record.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    console.error("tranche/support error", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
