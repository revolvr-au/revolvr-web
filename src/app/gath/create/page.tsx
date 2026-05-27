import { prisma } from "@/lib/prisma";
import GathCreatePageClient from "./GathCreatePageClient";

export const dynamic = "force-dynamic";

type SeedData = {
  trancheEventId: string;
  prefillName: string;
  prefillDescription: string;
  postId: string | null;
} | null;

export default async function GathCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string }>;
}) {
  const { seed } = await searchParams;

  let seedData: SeedData = null;
  if (seed) {
    const event = await prisma.trancheEvent.findUnique({
      where: { id: seed },
      select: {
        id: true,
        postId: true,
        comment: { select: { body: true } },
      },
    });
    if (event) {
      const body = event.comment?.body ?? "";
      seedData = {
        trancheEventId: event.id,
        prefillName: body.slice(0, 60),
        prefillDescription: `Seeded from a TRANCHE moment — ${body}`,
        postId: event.postId,
      };
    }
  }

  return <GathCreatePageClient seed={seedData} />;
}
