import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ avatar_url: null });
  }

  const { data } = await supabase
    .from("CreatorProfile")
    .select('avatar_url')
    .eq("email", user.email)
    .single();

  return NextResponse.json({
    avatar_url: data?.avatar_url ?? null,
  });
}