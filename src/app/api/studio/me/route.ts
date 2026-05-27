import { NextResponse } from "next/server";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/isAdmin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const email = await getAuthedEmailOrNull();
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studioUser = await prisma.studioUser.upsert({
    where: { email: email! },
    update: {},
    create: { email: email!, role: "ADMIN" },
    select: { email: true, role: true },
  });

  return NextResponse.json({ email: studioUser.email, role: studioUser.role });
}
