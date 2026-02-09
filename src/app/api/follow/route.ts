import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/auth";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: Request) {
  const auth = await requireUserEmail();
  if (!auth.ok) return bad("Unauthorized", auth.status);

  const body = await req.json().catch(() => null);
  const followingEmail = body?.followingEmail;

  if (!followingEmail) return bad("Missing followingEmail");
  if (auth.email === followingEmail) return bad("Cannot follow yourself");

  try {
    const follow = await prisma.follow.create({
      data: { followerEmail: auth.email, followingEmail },
    });
    return NextResponse.json({ follow }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return bad("Already following", 409);
    return bad("Failed to follow", 500);
  }
}

export async function DELETE(req: Request) {
  const auth = await requireUserEmail();
  if (!auth.ok) return bad("Unauthorized", auth.status);

  const body = await req.json().catch(() => null);
  const followingEmail = body?.followingEmail;

  if (!followingEmail) return bad("Missing followingEmail");

  await prisma.follow.deleteMany({
    where: { followerEmail: auth.email, followingEmail },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
