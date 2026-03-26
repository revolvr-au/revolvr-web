import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { postId, userEmail, body, parentId } = await req.json();

    if (!postId || !userEmail || !body) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        userEmail,
        body,
        parentId: parentId ? parentId : null,
      },
    });

    return NextResponse.json({ ok: true, comment });

  } catch (error) {
    console.error("COMMENT ERROR:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}