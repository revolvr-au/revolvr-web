import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = data.user;
  const email = String(user.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "no_email" }, { status: 400 });
  }

  // Delete in dependency order
  await prisma.comment.deleteMany({ where: { userEmail: email } });
  await prisma.like.deleteMany({ where: { userEmail: email } });
  await prisma.postReaction.deleteMany({ where: { userEmail: email } });
  await prisma.follow.deleteMany({
    where: { OR: [{ followerEmail: email }, { followingEmail: email }] },
  });
  await prisma.post.deleteMany({ where: { userEmail: email } });
  await prisma.userCredits.deleteMany({ where: { email } });
  await prisma.creatorBalance.deleteMany({ where: { creatorEmail: email } });
  await prisma.supportLedger.deleteMany({
    where: { OR: [{ creatorEmail: email }, { viewerEmail: email }] },
  });
  await prisma.creatorProfile.deleteMany({ where: { email } });
  await prisma.profiles.deleteMany({ where: { email } });

  // Delete Supabase auth user via service role client
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  await adminClient.auth.admin.deleteUser(user.id);

  return NextResponse.json({ ok: true });
}
