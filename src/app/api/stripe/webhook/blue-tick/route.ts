import { NextResponse } from "next/server";
import { handleVerificationWebhook } from "../_verification";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const whsec = process.env.STRIPE_WEBHOOK_SECRET_BLUE_TICK;
  if (!whsec) {
    return NextResponse.json(
      { error: "missing STRIPE_WEBHOOK_SECRET_BLUE_TICK" },
      { status: 500 }
    );
  }
  return handleVerificationWebhook(req, whsec);
}
