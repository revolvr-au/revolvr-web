import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ avatar_url: null });
  }

  const email = user.email?.toLowerCase() || "";

  const { data: profile } = await supabase
    .from("CreatorProfile")
    .select("avatar_url")
    .eq("email", email)
    .single();

  return NextResponse.json({
    avatar_url: profile?.avatar_url || null,
  });
}