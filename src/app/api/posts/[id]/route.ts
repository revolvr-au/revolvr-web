import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.post.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /posts/:id error:", err);
    return NextResponse.json(
      { message: "Failed to delete" },
      { status: 500 }
    );
  }
}
