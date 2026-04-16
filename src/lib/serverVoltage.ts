import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const VOLTAGE_WEIGHTS = {
  post_created: 2,
  comment_received: 3,
  follow_received: 8,
  gift_received: 20,
  share_received: 5,
  live_started: 10,
  live_gift_received: 25,
} as const;

export type VoltageEventType = keyof typeof VOLTAGE_WEIGHTS;

export async function awardVoltage({
  creatorEmail,
  eventType,
  actorEmail,
  targetType,
  targetId,
  dedupeKey,
}: {
  creatorEmail: string;
  eventType: VoltageEventType;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  dedupeKey?: string;
}) {
  const points = VOLTAGE_WEIGHTS[eventType];

  const inserted = await prisma.$queryRaw<any[]>(Prisma.sql`
    INSERT INTO "creator_voltage_events" (
      "creatorEmail",
      "actorEmail",
      "eventType",
      "points",
      "targetType",
      "targetId",
      "dedupeKey"
    )
    VALUES (
      ${creatorEmail},
      ${actorEmail ?? null},
      ${eventType.toUpperCase()}::"VoltageEventType",
      ${points},
      ${targetType ? Prisma.sql`${targetType.toUpperCase()}::"VoltageTargetType"` : null},
      ${targetId ?? null},
      ${dedupeKey ?? null}
    )
    ON CONFLICT ("dedupeKey") DO NOTHING
    RETURNING "id"
  `);

  if (!inserted.length) return;

  await prisma.creatorProfile.update({
    where: { email: creatorEmail },
    data: { voltage: { increment: points } },
  });
}