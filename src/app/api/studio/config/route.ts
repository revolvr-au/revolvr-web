import { NextRequest, NextResponse } from "next/server";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/isAdmin";
import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  voltageWeight: 1.0,
  interactionWeight: 7.0,
  clusterWeight: 4.0,
  momentumWeight: 5.0,
  momentumEnabled: true,
  clusteringEnabled: true,
  feedPaused: false,
};

async function ensureStudioUser(email: string) {
  await prisma.studioUser.upsert({
    where: { email },
    update: {},
    create: { email, role: "ADMIN" },
  });
}

export async function GET() {
  const email = await getAuthedEmailOrNull();
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await prisma.studioConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", ...DEFAULTS },
  });

  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  const actorEmail = await getAuthedEmailOrNull();
  if (!isAdminEmail(actorEmail)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await req.json();
  const {
    voltageWeight,
    interactionWeight,
    clusterWeight,
    momentumWeight,
    momentumEnabled,
    clusteringEnabled,
    feedPaused,
  } = data;

  const config = await prisma.studioConfig.upsert({
    where: { id: "singleton" },
    update: {
      voltageWeight,
      interactionWeight,
      clusterWeight,
      momentumWeight,
      momentumEnabled,
      clusteringEnabled,
      feedPaused,
      updatedBy: actorEmail,
    },
    create: {
      id: "singleton",
      voltageWeight: voltageWeight ?? DEFAULTS.voltageWeight,
      interactionWeight: interactionWeight ?? DEFAULTS.interactionWeight,
      clusterWeight: clusterWeight ?? DEFAULTS.clusterWeight,
      momentumWeight: momentumWeight ?? DEFAULTS.momentumWeight,
      momentumEnabled: momentumEnabled ?? DEFAULTS.momentumEnabled,
      clusteringEnabled: clusteringEnabled ?? DEFAULTS.clusteringEnabled,
      feedPaused: feedPaused ?? DEFAULTS.feedPaused,
      updatedBy: actorEmail,
    },
  });

  await ensureStudioUser(actorEmail!);
  await prisma.studioAuditLog.create({
    data: {
      actorEmail: actorEmail!,
      action: "config_updated",
      targetType: "config",
      targetId: "singleton",
      metadata: data,
    },
  });

  return NextResponse.json({ config });
}
