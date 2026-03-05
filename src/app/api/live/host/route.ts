import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from("CreatorProfile")
      .select('avatar_url, "displayName"')
      .eq("email", "wesbuhagiar@gmail.com")
      .single();

    if (error) {
      console.error("Supabase error:", error);
    }

    return NextResponse.json({
      avatar_url: data?.avatar_url ?? null,
      displayName: data?.displayName ?? "Creator",
    });

  } catch (err) {
    console.error("LIVE HOST ERROR", err);

    return NextResponse.json({
      avatar_url: null,
      displayName: "Creator",
    });
  }
}