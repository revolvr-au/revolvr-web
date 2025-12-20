// src/app/creator/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default function CreatorEntry() {
  redirect("/creator/dashboard");
}

export const dynamic = "force-dynamic";

  // NOTE:
  // Auth is assumed to be handled elsewhere (middleware / cookies / Supabase session).
  // For now, we keep the existing "sanity check" you were using:
  // If there is no ACTIVE creator profile, send the user to onboarding.

  const creator = await prisma.creatorProfile.findFirst({
    where: { status: "ACTIVE" },
    select: { displayName: true },
  });

  if (!creator) {
    redirect("/creator/onboard");
  }

  return (
    <div className="min-h-screen bg-[#050814] text-white p-8">
      <h1 className="text-2xl font-semibold">Creator Dashboard</h1>
      <p className="mt-2 text-white/70">Welcome, {creator.displayName}</p>
    </div>
  );
}
