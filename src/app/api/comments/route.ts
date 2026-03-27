export async function GET(req: Request) {
  console.log("👉 GET /api/comments hit");

  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    console.log("👉 postId:", postId);

    if (!postId) {
      return new Response(JSON.stringify({ ok: false, comments: [] }), {
        status: 200,
      });
    }

    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
    });

    console.log("👉 comments count:", comments.length);

    return new Response(JSON.stringify({ ok: true, comments }), {
      status: 200,
    });

  } catch (error: any) {
    console.error("🔥 FULL ERROR:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: error?.message || "unknown",
      }),
      { status: 500 }
    );
  }
}