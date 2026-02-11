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
  const res = await fetch(`/api/profile?email=${encodeURIComponent(email)}`, {
    cache: "no-store",
  }).catch(() => null);

  if (!res || !res.ok) return null;
  return (await res.json().catch(() => null)) as any;
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
    (apiProfile?.displayName && String(apiProfile.displayName).trim()) || email.split("@")[0];
  const handle =
    (apiProfile?.handle && String(apiProfile.handle).trim()) || `@${email.split("@")[0]}`;

  const profile: Profile = {
    email,
    displayName,
    handle,
    avatarUrl: apiProfile?.avatarUrl ?? null,
    bio: apiProfile?.bio ?? null,
    followersCount: apiProfile?.followersCount ?? 0,
    followingCount: apiProfile?.followingCount ?? 0,
    isVerified: Boolean(apiProfile?.isVerified),
  };

  const posts: ProfilePost[] = (apiPosts ?? []).map((p: any) => ({
    id: String(p.id),
    imageUrl: p?.imageUrl ?? null,
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
      <ProfileClient profile={profile} posts={posts} />
    </FeedLayout>
  );
}
