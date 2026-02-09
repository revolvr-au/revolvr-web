import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const viewerEmail = url.searchParams.get("viewerEmail");
  const profileEmail = url.searchParams.get("profileEmail");

  if (!viewerEmail || !profileEmail) return bad("Missing viewerEmail or profileEmail");

  const [rel, followers, following] = await Promise.all([
    prisma.follow.findUnique({
      where: {
        followerEmail_followingEmail: {
          followerEmail: viewerEmail,
          followingEmail: profileEmail,
        },
      },
      select: { id: true },
    }),
    prisma.follow.count({ where: { followingEmail: profileEmail } }),
    prisma.follow.count({ where: { followerEmail: profileEmail } }),
  ]);

  return NextResponse.json(
    { isFollowing: !!rel, counts: { followers, following } },
    { status: 200 }
  );
}
