import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/isAdmin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const email = await getAuthedEmailOrNull();

  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, email, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}
