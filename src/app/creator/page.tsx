import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function CreatorPage() {
  // NOTE: auth handled by middleware / cookies
  // Prisma checks creator existence
  const creator = await prisma.creatorProfile.findFirst({
    where: {
      status: "ACTIVE",
    },
  });

  if (!creator) {
    redirect("/creator/onboard");
  }

  return (
    <div className="min-h-screen bg-[#050814] text-white p-8">
      <h1 className="text-2xl font-semibold">Creator Dashboard</h1>
      <p className="mt-2 text-white/70">
        Welcome, {creator.displayName}
      </p>
    </div>
  );
}
