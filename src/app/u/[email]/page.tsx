// src/app/u/[email]/page.tsx
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";

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

async function getBaseUrl() {
  // Prefer explicit site URL if set (best for Vercel)
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL;

  if (envUrl) {
    // If it's already https://... keep it, otherwise assume https
    return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
  }

  // Fallback to request host
  const h = headers();
  const host = (await h).get("x-forwarded-host") || (await h).get("host");
  const proto = (await h).get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "https://www.revolvr.net";
}

async function getProfile(email: string) {
  const baseUrl = await getBaseUrl(); // Make sure this is awaited
  const url = `${baseUrl}/api/profile?email=${encodeURIComponent(email)}`;

  const res = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return null;

  return (await res.json().catch(() => null)) as any;
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { email: rawEmail } = await params;

  const raw = String(rawEmail ?? "");
  const email = safeDecode(raw).trim().toLowerCase();

  if (!email || !email.includes("@")) notFound();

  const data = await getProfile(email);

  // If API fails, still show a page (no 404), but keep it stable
  const fallbackProfile: Profile = {
    email,
    displayName: email.split("@")[0] || "User",
    handle: `@${email.split("@")[0] || "user"}`,
    avatarUrl: null,
    bio: null,
    followersCount: 0,
    followingCount: 0,
    isVerified: false,
  };

  const profile: Profile = data?.ok && data?.profile ? data.profile : fallbackProfile;
  const posts: ProfilePost[] = data?.ok && Array.isArray(data?.posts) ? data.posts : [];

  const displayName = (profile?.displayName || "").trim() || fallbackProfile.displayName;
  const handle = (profile?.handle || "").trim() || fallbackProfile.handle;

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
