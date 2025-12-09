// src/pages/api/live/end.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Data =
  | { ok: true }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sessionId } = req.body ?? {};

  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "sessionId is required" });
  }

  // In our create API, we store the room name in live_sessions.room_name
  // sessionId === roomName, so we match on room_name here.
  const { error } = await supabase
    .from("live_sessions")
    .update({ status: "ended" })
    .eq("room_name", sessionId);

  if (error) {
    console.error("[live/end] failed to update live_sessions", error);
    return res.status(500).json({ error: "Could not end live session" });
  }

  return res.status(200).json({ ok: true });
}
