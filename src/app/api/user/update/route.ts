import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = String(body.email || "").trim().toLowerCase();
    const avatarUrl = String(body.avatarUrl || "").trim();

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { email },
      data: { avatarUrl },
    });

    return NextResponse.json({ ok: true, user });
  } catch (err) {
    console.error("[user update error]", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}