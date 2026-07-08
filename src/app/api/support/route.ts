export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const SUPPORT_INBOX = "revolvrassist@gmail.com";

// User-facing support categories. Mirrors the TrancheSupportRequest.type
// discriminator so no schema change is needed — business/professional
// requests use "tfc"/"general", user support uses the values below.
// NOTE: "safety" is intentionally absent — safety reports go through /report
// (api/report) which carries the child-safety escalation path. A stray
// category=safety here falls back to "general" rather than being accepted.
const CATEGORY_LABELS: Record<string, string> = {
  account: "Account",
  payments: "Payments & credits",
  bug: "Bug report",
  general: "General",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const message = String(body?.message ?? "").trim();
    const rawCategory = String(body?.category ?? "general").trim();
    const category = CATEGORY_LABELS[rawCategory] ? rawCategory : "general";

    if (!name || !email.includes("@") || !message) {
      return NextResponse.json(
        { ok: false, error: "invalid_input" },
        { status: 400 },
      );
    }

    if (name.length > 200 || message.length > 5000) {
      return NextResponse.json(
        { ok: false, error: "too_long" },
        { status: 400 },
      );
    }

    // Reuse the TrancheSupportRequest model + delivery-tracking pattern.
    // type is prefixed to keep user support distinguishable from business
    // enquiries within the same table.
    const record = await prisma.trancheSupportRequest.create({
      data: { name, email, message, type: `support:${category}` },
    });

    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM ?? "Revolvr Support <support@revolvr.au>";

    if (apiKey) {
      const subject = `[Revolvr Support] ${CATEGORY_LABELS[category]} — ${name}`;

      const text = [
        `Category: ${CATEGORY_LABELS[category]}`,
        `Name: ${name}`,
        `Email: ${email}`,
        "",
        "Message:",
        message,
        "",
        `Record ID: ${record.id}`,
      ].join("\n");

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
    console.error("support error", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
