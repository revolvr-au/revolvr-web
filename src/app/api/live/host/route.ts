import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ avatar_url: null });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("CreatorProfile")
    .select("avatar_url")
    .eq("email", email)
    .single();

  if (error) {
    console.error("CreatorProfile lookup error:", error);
  }

  return NextResponse.json({
    avatar_url: data?.avatar_url ?? null
  });
}