import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/auth";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profileEmail = url.searchParams.get("profileEmail");
  if (!profileEmail) return bad("Missing profileEmail");

  const auth = await requireUserEmail();
  if (!auth.ok) {
    // logged out => not following (keep UI stable)
    return NextResponse.json({ isFollowing: false }, { status: 200 });
  }

  const rel = await prisma.follow.findUnique({
    where: {
      followerEmail_followingEmail: {
        followerEmail: auth.email,
        followingEmail: profileEmail,
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ isFollowing: !!rel }, { status: 200 });
}
