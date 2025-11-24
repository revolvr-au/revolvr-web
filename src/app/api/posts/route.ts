mkdir -p src/app/api/posts
cat > src/app/api/posts/route.ts << 'EOF'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/posts - return all posts, newest first
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(posts);
  } catch (err) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json(
      { message: "Failed to load posts" },
      { status: 500 }
    );
  }
}

// POST /api/posts - create a new post
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const caption = (body.caption ?? "").trim();
    const imageUrl = (body.imageUrl ?? "").trim();
    const userEmail = (body.userEmail ?? "").trim();

    if (!userEmail) {
      return NextResponse.json(
        { message: "User email is required" },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { message: "Image URL is required" },
        { status: 400 }
      );
    }

    if (!caption) {
      return NextResponse.json(
        { message: "Caption is required" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        userEmail,
        imageUrl,
        caption,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    console.error("POST /api/posts error:", err);
    return NextResponse.json(
      { message: "Failed to create post" },
      { status: 500 }
    );
  }
}
EOF
