import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
  params,
}: {
  params: { email: string };
}) {
  const email = decodeURIComponent(params.email).toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    notFound();
  }

  const creator = await prisma.creatorProfile.findUnique({
    where: { email },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">
        {creator?.displayName || creator?.handle || "User"}
      </h1>

      <p className="mt-1 text-sm text-white/60">{email}</p>

      {creator ? (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Creator status:</span>
            {creator.verificationStatus === "gold" && (
              <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-semibold text-yellow-300">
                Gold
              </span>
            )}
            {creator.verificationStatus === "blue" && (
              <span className="rounded-full bg-blue-400/20 px-3 py-1 text-xs font-semibold text-blue-300">
                Verified
              </span>
            )}
            {!creator.verificationStatus && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                Creator
              </span>
            )}
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-4">
            <p className="text-sm text-white/70">
              Creator profile active and ready.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-xl bg-white/5 border border-white/10 px-4 py-4">
          <p className="text-sm text-white/70">
            This user has not activated a creator profile.
          </p>
        </div>
      )}
    </div>
  );
}
