import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const email = (searchParams.get("email") || "")
    .trim()
    .toLowerCase();

  if (!email) {
    return NextResponse.json({ avatar_url: null }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("CreatorProfile")
    .select("avatar_url")
    .ilike("email", email)
    .limit(1)
    .single();

  if (error) {
    console.error("CreatorProfile lookup error:", error);
    return NextResponse.json({ avatar_url: null }, { status: 500 });
  }

  return NextResponse.json({ avatar_url: data?.avatar_url ?? null });
}