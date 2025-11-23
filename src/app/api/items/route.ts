import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/items  -> list all items (latest first)
export async function GET() {
  try {
    const items = await prisma.revolvrItem.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (err: any) {
    console.error("GET /api/items error:", err);

    return NextResponse.json(
      {
        error: "GET_FAILED",
        message: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}

// POST /api/items  -> create a new item
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawName = body?.name as string | undefined;
    const name = rawName?.trim() ?? "";

    if (!name) {
      return NextResponse.json(
        { error: "VALIDATION", message: "Name is required" },
        { status: 400 }
      );
    }

    const item = await prisma.revolvrItem.create({
      data: { name },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/items error:", err);

    return NextResponse.json(
      {
        error: "POST_FAILED",
        message: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}
