// src/app/api/items/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickSpinnerOutcome } from "@/lib/spinner"; // for the spinner route


// GET /api/items
export async function GET() {
  try {
    const items = await prisma.revolvrItem.findMany({
      orderBy: { createdAt: "desc" },
    });

    // items already have `name`, `notes`, `status`, `value`, etc.
    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/items error:", err);
    return NextResponse.json(
      { message: "Failed to load items" },
      { status: 500 }
    );
  }
}

// POST /api/items
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = (body.title ?? "").trim();
    const notes = (body.notes ?? "").trim();
    const status = body.status ?? "NEW";
    const value =
      typeof body.value === "number"
        ? body.value
        : body.value
        ? Number(body.value)
        : null;

    if (!title) {
      return NextResponse.json(
        { message: "Title is required" },
        { status: 400 }
      );
    }

    const item = await prisma.revolvrItem.create({
      data: {
        // Prisma model has `name`, so map the request `title` to it
        name: title,
        notes: notes || null,
        status,
        value: Number.isNaN(value) ? null : value,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("POST /api/items error:", err);
    return NextResponse.json(
      { message: "Failed to create item" },
      { status: 500 }
    );
  }
}
