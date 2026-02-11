import { notFound } from "next/navigation";
import FeedLayout from "@/components/FeedLayout";

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
      <div className="space-y-5 pb-12">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center text-sm font-semibold uppercase">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (displayName || "u")[0].toUpperCase()
            )}
          </div>

          <div className="min-w-0">
            <div className="text-sm text-white/60 break-all">{email}</div>
            {bio ? (
              <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{bio}</p>
            ) : (
              <p className="mt-2 text-sm text-white/60">Profile page coming online.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium">Posts</span>
            <span className="text-xs text-white/40">{posts.length}</span>
          </div>

          {!posts.length ? (
            <div className="px-4 py-5 text-sm text-white/60">No posts yet.</div>
          ) : (
            <div className="grid grid-cols-3 gap-2 p-3">
              {posts.map((p: any) => {
                const img = (p?.imageUrl && String(p.imageUrl).trim()) || null;
                return (
                  <div
                    key={p.id}
                    className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10"
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </FeedLayout>
  );
}
