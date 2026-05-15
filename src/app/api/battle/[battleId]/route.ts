import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  // battle
  id: string;
  battle_type: string;
  status: string;
  stream_id_a: string;
  stream_id_b: string | null;
  creator_email_a: string | null;
  creator_email_b: string | null;
  voltage_a: number;
  voltage_b: number;
  winner_email: string | null;
  started_at: Date | null;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
  timer_started_at: Date | null;
  duration_seconds: number;

  // streamA
  sa_id: string | null;
  sa_ivs: string | null;
  sa_email: string | null;
  sa_caption: string | null;
  sa_status: string | null;
  sa_display: string | null;
  sa_handle: string | null;
  sa_avatar: string | null;
  sa_live_avatar: string | null;
  sa_char: number | null;

  // streamB
  sb_id: string | null;
  sb_ivs: string | null;
  sb_email: string | null;
  sb_caption: string | null;
  sb_status: string | null;
  sb_display: string | null;
  sb_handle: string | null;
  sb_avatar: string | null;
  sb_live_avatar: string | null;
  sb_char: number | null;
};

function shapeStream(prefix: "sa" | "sb", row: Row) {
  const id = row[`${prefix}_id` as const] as string | null;
  if (!id) return null;
  return {
    id,
    status: row[`${prefix}_status` as const],
    ivsPlaybackUrl: row[`${prefix}_ivs` as const],
    creatorEmail: row[`${prefix}_email` as const],
    displayName: row[`${prefix}_display` as const],
    handle: row[`${prefix}_handle` as const] ?? (row[`${prefix}_email` as const]?.split("@")[0] ?? null),
    avatarUrl: row[`${prefix}_avatar` as const],
    avatarLiveUrl: row[`${prefix}_live_avatar` as const],
    caption: row[`${prefix}_caption` as const],
    characterId: row[`${prefix}_char` as const] ?? 1,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { battleId: string } }
) {
  try {
    const { battleId } = await params;

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT
        b.id,
        b.battle_type,
        b.status,
        b.stream_id_a,
        b.stream_id_b,
        b.creator_email_a,
        b.creator_email_b,
        b.voltage_a,
        b.voltage_b,
        b.winner_email,
        b.started_at,
        b.ended_at,
        b.created_at,
        b.updated_at,
        b.timer_started_at,
        b.duration_seconds,

        pa.id                                                       AS sa_id,
        pa.ivs_playback_url                                         AS sa_ivs,
        pa."user_Email"                                             AS sa_email,
        pa.caption                                                  AS sa_caption,
        CASE WHEN pa.live_ended_at IS NOT NULL THEN 'ENDED' ELSE 'ACTIVE' END AS sa_status,
        COALESCE(pfa.display_name, ca."displayName", split_part(pa."user_Email", '@', 1)) AS sa_display,
        ca.handle                                                   AS sa_handle,
        COALESCE(pfa.avatar_url, ca.avatar_url)                     AS sa_avatar,
        ca.avatar_live_url                                          AS sa_live_avatar,
        ca.character_id                                             AS sa_char,

        pb.id                                                       AS sb_id,
        pb.ivs_playback_url                                         AS sb_ivs,
        pb."user_Email"                                             AS sb_email,
        pb.caption                                                  AS sb_caption,
        CASE WHEN pb.live_ended_at IS NOT NULL THEN 'ENDED' ELSE 'ACTIVE' END AS sb_status,
        COALESCE(pfb.display_name, cb."displayName", split_part(pb."user_Email", '@', 1)) AS sb_display,
        cb.handle                                                   AS sb_handle,
        COALESCE(pfb.avatar_url, cb.avatar_url)                     AS sb_avatar,
        cb.avatar_live_url                                          AS sb_live_avatar,
        cb.character_id                                             AS sb_char

      FROM live_battles b
      LEFT JOIN "Post"            pa  ON pa.id   = b.stream_id_a
      LEFT JOIN "Post"            pb  ON pb.id   = b.stream_id_b
      LEFT JOIN profiles          pfa ON pfa.email = pa."user_Email"
      LEFT JOIN profiles          pfb ON pfb.email = pb."user_Email"
      LEFT JOIN "CreatorProfile"  ca  ON ca.email  = pa."user_Email"
      LEFT JOIN "CreatorProfile"  cb  ON cb.email  = pb."user_Email"
      WHERE b.id = ${battleId}::uuid
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const row = rows[0];

    const battle = {
      id: row.id,
      battleType: row.battle_type,
      status: row.status,
      streamIdA: row.stream_id_a,
      streamIdB: row.stream_id_b,
      creatorEmailA: row.creator_email_a,
      creatorEmailB: row.creator_email_b,
      voltageA: row.voltage_a,
      voltageB: row.voltage_b,
      winnerEmail: row.winner_email,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      timerStartedAt: row.timer_started_at,
      durationSeconds: row.duration_seconds,
    };

    return NextResponse.json({
      battle,
      streamA: shapeStream("sa", row),
      streamB: shapeStream("sb", row),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
