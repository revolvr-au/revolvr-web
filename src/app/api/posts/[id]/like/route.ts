// src/app/api/posts/[id]/like/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = {
  params: { id: string };
};

// POST /api/posts/:id/like  – toggle like for this user
export async function POST(req: Request, { params }: Params) {
  try {
    const { id: postId } = params;
    const body = await req.json().catch(() => ({}));
    const { userEmail } = body as { userEmail?: string };

    if (!userEmail) {
      return NextResponse.json(
        { message: 'userEmail is required' },
        { status: 400 }
      );
    }

    // Check if this user already liked it
    const existing = await prisma.like.findUnique({
      where: {
        postId_userEmail: {
          postId,
          userEmail,
        },
      },
    });

    if (existing) {
      // Unlike
      await prisma.like.delete({ where: { id: existing.id } });
    } else {
      // Like
      await prisma.like.create({
        data: { postId, userEmail },
      });
    }

    const likesCount = await prisma.like.count({
      where: { postId },
    });

    return NextResponse.json({ likesCount });
  } catch (err) {
    console.error('POST /api/posts/[id]/like error:', err);
    return NextResponse.json(
      { message: 'Failed to toggle like' },
      { status: 500 }
    );
  }
}
