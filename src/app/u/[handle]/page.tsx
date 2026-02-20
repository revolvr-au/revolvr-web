// src/app/u/[handle]/page.tsx

import ProfileClient from "./ProfileClient";
import { headers } from "next/headers";

export const dynamic = "force-dynamic"; // profile data changes often

export default async function ProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  const handle = decodeURIComponent(params.handle || "").trim();

  // ✅ Build correct base URL dynamically (works on Vercel + local)
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "https";

  const baseUrl = `${protocol}://${host}`;

  const res = await fetch(
    `${baseUrl}/api/public/profile?handle=${encodeURIComponent(handle)}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return (
      <div className="min-h-screen bg-[#050814] text-white p-6">
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-lg font-semibold">Profile not found</div>
          <div className="text-sm text-white/60 mt-1">/{handle}</div>
        </div>
      </div>
    );
  }

  const { profile, posts } = await res.json();

  return (
    <div className="min-h-screen bg-[#050814] text-white">
      <main className="max-w-3xl mx-auto px-4 py-6">
        <ProfileClient profile={profile} posts={posts} />
      </main>
    </div>
  );
}