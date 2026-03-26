export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ ok: false, comments: [] });
    }

    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ ok: true, comments });

  } catch (error) {
    console.error("GET COMMENTS ERROR:", error);
    return NextResponse.json({ ok: false, comments: [] });
  }
}