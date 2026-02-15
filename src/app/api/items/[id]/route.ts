export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ✅ GET single item (optional but handy)
export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;

    const item = await prisma.revolvrItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (err) {
    console.error("GET /api/items/[id] error", err);
    return NextResponse.json(
      { message: "Failed to load item" },
      { status: 500 }
    );
  }
}

// ✅ UPDATE
export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params; // ⬅️ the important bit

    const json = await req.json();
    const { title, notes, status, value } = json as {
      title?: string;
      notes?: string | null;
      status?: "NEW" | "ACTIVE" | "WON" | "LOST";
      value?: number | null;
    };

    const item = await prisma.revolvrItem.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
        ...(value !== undefined && { value }),
      },
    });

    return NextResponse.json(item);
  } catch (err) {
    console.error("PATCH /api/items/[id] error", err);
    return NextResponse.json(
      { message: "Failed to update item" },
      { status: 500 }
    );
  }
}

// ✅ DELETE
export async function DELETE(_req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params; // ⬅️ same trick

    await prisma.revolvrItem.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/items/[id] error", err);
    return NextResponse.json(
      { message: "Failed to delete item" },
      { status: 500 }
    );
  }
}
