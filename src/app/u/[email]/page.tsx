import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProfileClient, { type ProfilePost } from "./ProfileClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ email: string }>;
};

function formatMonthYear(d: Date) {
  try {
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short" }).format(d);
  } catch {
    return d.toISOString();
  }
}

function safePickString(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { email: rawEmail } = await params;
  const email = decodeURIComponent(rawEmail).toLowerCase();

  const creator = await prisma.creatorProfile.findUnique({
    where: { email },
    select: {
      email: true,
      displayName: true,
      handle: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      verificationStatus: true,
    },
  });

  const postsDb = await prisma.post.findMany({
    where: { userEmail: email },
    orderBy: { createdAt: "desc" },
    take: 48,
  });

  if (!creator && postsDb.length === 0) {
    notFound();
  }

  const displayName =
    creator?.displayName ||
    creator?.handle ||
    email.split("@")[0] ||
    "User";

  const handle = creator?.handle ? `@${creator.handle}` : null;

  const verification =
    creator?.verificationStatus === "gold"
      ? "gold"
      : creator?.verificationStatus === "blue"
        ? "blue"
        : null;

  const avatarUrl =
    safePickString(creator as any, ["avatarUrl", "imageUrl", "profileImageUrl"]) || null;

  const bio =
    safePickString(creator as any, ["bio", "about", "description"]) || null;

  const memberSinceBase: Date | null =
    (creator as any)?.createdAt
      ? new Date((creator as any).createdAt)
      : postsDb[postsDb.length - 1]?.createdAt
        ? new Date(postsDb[postsDb.length - 1].createdAt)
        : null;

  const accountType = creator ? "Creator" : "User";

  const trustLine = [
    verification === "gold"
      ? "Verified Business"
      : verification === "blue"
        ? "Verified Individual"
        : null,
    accountType,
    memberSinceBase ? `Member since ${formatMonthYear(memberSinceBase)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const posts: ProfilePost[] = postsDb.map((p) => ({
    id: p.id,
    imageUrl: (p as any).imageUrl ?? "",
    mediaType: (p as any).mediaType ?? "",
    caption: (p as any).caption ?? null,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <ProfileClient
      email={email}
      displayName={displayName}
      handle={handle}
      verification={verification}
      trustLine={trustLine || null}
      avatarUrl={avatarUrl}
      bio={bio}
      posts={posts}
    />
  );
}
