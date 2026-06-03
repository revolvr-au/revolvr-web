export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";

const SAFETY_INBOX = "revolvrassist@gmail.com";

// Form category → normalized reason token persisted on Report.reason.
// CHILD_SAFETY is the highest-severity path and maps to "csam"; it is treated
// distinctly below (escalation banner + always-email) so it is never buried.
const CATEGORY_TO_REASON: Record<string, string> = {
  CHILD_SAFETY: "csam",
  HARASSMENT: "harassment",
  SCAM_FRAUD: "scam_fraud",
  IMPERSONATION: "impersonation",
  INAPPROPRIATE_CONTENT: "inappropriate_content",
  OTHER: "other",
};

// Best-effort targetType inference from the user-pasted link/@handle. Grounded in
// the app's real route shapes; falls back to "unknown" when nothing matches.
function inferTargetType(raw: string): string {
  const v = raw.trim();
  if (!v) return "unknown";
  if (v.startsWith("@") && !v.includes("/")) return "user"; // bare @handle

  let path = v.toLowerCase();
  try {
    if (/^https?:\/\//i.test(v)) path = new URL(v).pathname.toLowerCase();
  } catch {
    // not a parseable URL — match against the raw lowercased value
  }
  const has = (s: string) => path.includes(s);
  if (has("/u/") || has("/user/") || has("/people") || has("/creator/") || has("/studio/") || has("/profile")) return "user";
  if (has("/live/") || has("/go-live")) return "live";
  if (has("/messages/") || has("/dm/")) return "message";
  if (has("/tranche")) return "tranche";
  if (has("/comment")) return "comment";
  if (has("/post") || has("/p/") || has("/feed")) return "post";
  return "unknown";
}

type EmailArgs = {
  category: string;
  reason: string;
  link: string;
  details: string;
  reporterEmail: string | null;
  recordId: string | null;
  isChildSafety: boolean;
  dbError: string | null;
};

// Best-effort email delivery via Resend (same mechanism as tranche/support).
// Returns true only if the email was actually sent. Used as the no-loss fallback
// when the DB write fails, and as an always-on escalation for child-safety reports.
async function sendReportEmail(args: EmailArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[report] RESEND_API_KEY missing — email path unavailable");
    return false;
  }
  const fromAddress = process.env.RESEND_FROM ?? "Revolvr Safety <support@revolvr.au>";

  const subject = args.isChildSafety
    ? `🚨 [CHILD SAFETY / CSAM — ESCALATE] report ${args.recordId ?? "(unsaved)"}`
    : `[Safety Report: ${args.category}]${args.dbError ? " (DB fallback)" : ""}`;

  const text = [
    args.isChildSafety
      ? "*** CHILD SAFETY / CSAM REPORT — HIGHEST PRIORITY — ESCALATE IMMEDIATELY ***"
      : null,
    `Category: ${args.category} (reason=${args.reason})`,
    `Reporter: ${args.reporterEmail ?? "anonymous"}`,
    args.link ? `Link / @handle: ${args.link}` : "Link: (none provided)",
    "",
    "Details:",
    args.details || "(no details provided)",
    "",
    args.recordId
      ? `Report record ID: ${args.recordId}`
      : "DB record: NOT SAVED — this email is the only copy of this report.",
    args.dbError ? `DB error: ${args.dbError}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromAddress,
      to: SAFETY_INBOX,
      subject,
      text,
      ...(args.reporterEmail ? { replyTo: args.reporterEmail } : {}),
    });
    return true;
  } catch (err) {
    console.error("[report] email send failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const category = String(b.category ?? "").trim().toUpperCase();
  const link = String(b.link ?? "").trim();
  const details = String(b.details ?? "").trim();

  // Validate the category against the accepted set (and map → reason).
  const reason = CATEGORY_TO_REASON[category];
  if (!reason) {
    return NextResponse.json({ ok: false, error: "invalid_category" }, { status: 400 });
  }
  if (link.length > 2000 || details.length > 5000) {
    return NextResponse.json({ ok: false, error: "too_long" }, { status: 400 });
  }

  const isChildSafety = reason === "csam";
  const targetType = inferTargetType(link);
  const targetId = link || "unspecified"; // Report.targetId is NOT NULL
  const reporterEmail = await getAuthedEmailOrNull(); // null = anonymous (allowed)

  // Distinct, unmissable marker for child-safety reports inside the note body.
  const note = isChildSafety
    ? `⚠️ CHILD SAFETY / CSAM — ESCALATE IMMEDIATELY\n\n${details || "(no details provided)"}`
    : details || null;

  // 1) Persist to the Report table.
  let recordId: string | null = null;
  let dbError: string | null = null;
  try {
    const record = await prisma.report.create({
      data: { reporterEmail, targetType, targetId, reason, note },
    });
    recordId = record.id;
  } catch (err) {
    dbError = err instanceof Error ? err.message : "db_write_failed";
    console.error("[report] DB write failed:", dbError);
  }

  // 2) Email delivery:
  //    - child-safety: ALWAYS email immediately (escalation), regardless of DB outcome
  //      so the highest-severity reports never sit in the general queue;
  //    - otherwise: email only as a no-loss fallback when the DB write failed.
  let emailed = false;
  if (isChildSafety || dbError !== null) {
    emailed = await sendReportEmail({
      category,
      reason,
      link,
      details,
      reporterEmail,
      recordId,
      isChildSafety,
      dbError,
    });
  }

  // 3) Only return ok if the report was captured somewhere (DB or email).
  if (recordId || emailed) {
    return NextResponse.json({ ok: true, id: recordId });
  }

  // Captured nowhere: DB failed AND email failed/unavailable. Surface an error so the
  // client shows its mailto fallback — the report must not be silently dropped.
  console.error("[report] CAPTURE FAILED — neither DB nor email succeeded", { dbError });
  return NextResponse.json({ ok: false, error: "capture_failed" }, { status: 500 });
}
