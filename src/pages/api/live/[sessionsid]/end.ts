// src/pages/api/live/[sessionId]/end.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type Data = { ok: true } | { error: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)"
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sessionIdParam = req.query.sessionId;
  const sessionId =
    typeof sessionIdParam === "string" ? sessionIdParam : sessionIdParam?.[0];

  if (!sessionId) {
    return res.status(400).json({ error: "Missing sessionId" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await supabase
    .from("live_sessions")
    .update({ status: "ended" }) // keep it simple: just mark ended
    .eq("room_name", sessionId);

  if (error) {
    console.error("[live/end] failed to update live_sessions", error);
    return res.status(500).json({ error: "Failed to end live session" });
  }

  return res.status(200).json({ ok: true });
}
