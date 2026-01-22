// src/app/api/live/chat/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type Body = {
  roomId?: string;
  message?: string;
};

async function getSupabase() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

/**
 * GET /api/live/chat?roomId=...&limit=50
 * Returns latest chat messages for a room.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const roomId = String(url.searchParams.get("roomId") ?? "").trim();

    const limitRaw = Number(url.searchParams.get("limit") ?? 50);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 200)
      : 50;

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from("live_chat_messages")
      .select(
        "id, room_id, user_id, user_email, display_name, avatar_url, message, created_at"
      )
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // UI usually wants oldest->newest
    const messages = Array.isArray(data) ? data.slice().reverse() : [];

    return NextResponse.json({ ok: true, messages });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message || e || "Chat fetch failed") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/live/chat
 * Body: { roomId, message }
 * Requires auth.
 */
export async function POST(req: Request) {
  try {
    const supabase = await getSupabase();

    // Auth required to post
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;

    const roomId = String(body.roomId ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }
    if (message.length > 280) {
      return NextResponse.json(
        { error: "Message too long (max 280)" },
        { status: 400 }
      );
    }

    const u = authData.user;
    const email = (u.email ?? "").toLowerCase();

    const displayName =
      (typeof u.user_metadata?.display_name === "string" &&
        u.user_metadata.display_name.trim()) ||
      (typeof u.user_metadata?.full_name === "string" &&
        u.user_metadata.full_name.trim()) ||
      (email ? email.split("@")[0] : "user");

    const avatarUrl =
      typeof u.user_metadata?.avatar_url === "string"
        ? u.user_metadata.avatar_url
        : null;

    const { data: inserted, error: insErr } = await supabase
      .from("live_chat_messages")
      .insert({
      room_id: roomId,
      user_id: u.id,
      user_email: email || null,
      display_name: displayName || null,
      avatar_url: avatarUrl,
      message,
      })
      .select("id, room_id, user_id, user_email, display_name, avatar_url, message, created_at")
      .single();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: inserted });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message || e || "Chat send failed") },
      { status: 500 }
    );
  }
}
