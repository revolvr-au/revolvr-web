// src/app/api/studio/users/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/isAdmin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const email = await getAuthedEmailOrNull();

    if (!isAdminEmail(email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔴 TEMP: disable DB call completely to prove route works
    return NextResponse.json({
      users: [],
      debug: "studio route alive",
      email,
    });

  } catch (e: any) {
    console.error("Studio API fatal error:", e);

    return NextResponse.json({
      users: [],
      error: "Studio API crashed",
      details: e?.message || "unknown",
    });
  }
}
