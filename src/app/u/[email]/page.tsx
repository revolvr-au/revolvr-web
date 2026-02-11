import { notFound } from "next/navigation";
import FeedLayout from "@/components/FeedLayout";
import ProfileClient, { type ProfilePost } from "../ProfileClient";



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
  // IMPORTANT: relative URL so it works on Vercel + avoids base url issues
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
  const profile = data?.ok ? data.profile : null;
  const posts = data?.ok ? (data.posts ?? []) : [];

  const displayName =
    (profile?.displayName && String(profile.displayName).trim()) || email.split("@")[0];
  const handle =
    (profile?.handle && String(profile.handle).trim()) || `@${email.split("@")[0]}`;
  const avatarUrl =
    (profile?.avatarUrl && String(profile.avatarUrl).trim()) || null;
  const bio =
    (profile?.bio && String(profile.bio).trim()) || null;
return (
  <FeedLayout title={displayName} subtitle={handle}>
    <ProfileClient
      profile={{
        email,
        displayName,
        handle,
        avatarUrl,
        bio,
      }}
      posts={(posts ?? []) as ProfilePost[]}
    />
  </FeedLayout>
);
}


