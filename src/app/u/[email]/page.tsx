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
  const res = await fetch(`/api/profile?email=${encodeURIComponent(email)}`, {
    cache: "no-store",
  }).catch(() => null);

  if (!res?.ok) return null;
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

  const displayName = String(profile?.displayName ?? email.split("@")[0]);
  const handle = String(profile?.handle ?? `@${email.split("@")[0]}`);

  return (
    <FeedLayout title={displayName} subtitle={handle}>
      <div className="space-y-5 pb-12">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-sm text-white/50 break-all">{email}</div>
          {profile?.bio ? (
            <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{String(profile.bio)}</p>
          ) : (
            <p className="mt-2 text-sm text-white/60">Profile page coming online.</p>
          )}
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium">Posts</span>
          </div>

          {!posts.length ? (
            <div className="px-4 py-5 text-sm text-white/60">No posts yet.</div>
          ) : (
            <div className="grid grid-cols-3 gap-2 p-3">
              {posts.map((p: any) => {
                const img = (p?.media?.length && p.media[0]?.url) || p?.imageUrl || null;
                return (
                  <div
                    key={p.id}
                    className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10"
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={String(img)} alt="" className="h-full w-full object-cover" />
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
