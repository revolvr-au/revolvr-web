import Link from "next/link";
import { notFound } from "next/navigation";
import FeedLayout from "@/components/FeedLayout";
import ProfileClient, { type Profile, type ProfilePost } from "../ProfileClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { email: string };

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

async function getProfile(email: string) {
  // IMPORTANT: relative URL so it works on Vercel
  const res = await fetch(`/api/profile?email=${encodeURIComponent(email)}`, {
    cache: "no-store",
  }).catch(() => null);

  if (!res || !res.ok) return null;
  return (await res.json().catch(() => null)) as any;
}

function fallbackHandle(email: string) {
  const [local] = String(email).split("@");
  const cleaned = (local || "user").replace(/[^a-z0-9_]+/gi, "").slice(0, 30);
  return cleaned ? `@${cleaned}` : "@user";
}

function fallbackDisplayName(email: string) {
  const [local] = String(email).split("@");
  const cleaned = (local || "User").replace(/\W+/g, " ").trim();
  return cleaned || "User";
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { email: rawEmail } = await params;

  const raw = String(rawEmail ?? "");
  const email = safeDecode(raw).trim().toLowerCase();

  if (!email || !email.includes("@")) notFound();

  const data = await getProfile(email);

  const apiProfile = data?.ok ? data.profile : null;
  const apiPosts = data?.ok ? (data.posts ?? []) : [];

  const displayName =
    (apiProfile?.displayName && String(apiProfile.displayName).trim()) ||
    fallbackDisplayName(email);

  const handle =
    (apiProfile?.handle && String(apiProfile.handle).trim()) || fallbackHandle(email);

  const avatarUrl =
    (apiProfile?.avatarUrl && String(apiProfile.avatarUrl).trim()) || null;

  const bio = (apiProfile?.bio && String(apiProfile.bio).trim()) || null;

  // Normalize into the ProfileClient types
  const profileData: Profile = {
    email,
    displayName,
    handle,
    avatarUrl,
    bio,
    followersCount: Number(apiProfile?.followersCount ?? 0),
    followingCount: Number(apiProfile?.followingCount ?? 0),
    isVerified: Boolean(apiProfile?.isVerified ?? false),
  };

  const postsData: ProfilePost[] = (apiPosts ?? []).map((p: any) => ({
    id: String(p?.id ?? crypto.randomUUID()),
    imageUrl: p?.imageUrl ?? (p?.media?.[0]?.url ?? null),
    caption: p?.caption ?? null,
    createdAt: p?.createdAt ?? null,
  }));

  return (
    <FeedLayout
      title={displayName}
      subtitle={handle}
      showMenu
      menuHref="/command"
      right={
        <Link
          href="/public-feed"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition hover:bg-white/10"
          aria-label="Back"
          title="Back"
        >
          ←
        </Link>
      }
    >
      <ProfileClient profile={profileData} posts={postsData} />
    </FeedLayout>
  );
}
