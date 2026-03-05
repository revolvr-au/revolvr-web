export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ avatar_url: null }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("SUPABASE ENV MISSING", { url: !!url, key: !!key });
    return NextResponse.json({ avatar_url: null }, { status: 500 });
  }

  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from("CreatorProfile")
    .select("avatar_url")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("CreatorProfile lookup error:", error);
    return NextResponse.json({ avatar_url: null }, { status: 500 });
  }

  return NextResponse.json({ avatar_url: data?.avatar_url ?? null });
}