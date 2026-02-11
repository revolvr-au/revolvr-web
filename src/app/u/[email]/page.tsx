import { notFound } from "next/navigation";
import { headers } from "next/headers";
import ProfileClient, { type ProfilePost } from "../ProfileClient";

type Params = { email: string };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function getBaseUrl() {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (envBase) return envBase.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`.replace(/\/+$/, "");

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`.replace(/\/+$/, "");

  return "";
}

async function getProfile(email: string) {
  const base = getBaseUrl();
  const url = `${base}/api/profile?email=${encodeURIComponent(email)}`;

  const res = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return null;

  const json = await res.json().catch(() => null);
  return json as any;
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { email: rawEmail } = await params;

  const email = safeDecode(String(rawEmail ?? "")).trim().toLowerCase();
  if (!email || !email.includes("@")) notFound();

  const data = await getProfile(email);
  const profile = data?.ok ? data.profile : null;
  const posts: ProfilePost[] = data?.ok ? (data.posts ?? []) : [];

  // prevent server crash -> show 404 instead of "Application error"
  if (!profile?.email) notFound();

  return (
    <ProfileClient
      profile={profile}
      posts={posts}
      viewerEmail={null}
      backHref="/public-feed"
    />
  );
}
