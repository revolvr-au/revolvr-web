import FeedLayout from "@/components/FeedLayout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function normEmail(v: string) {
  return String(v ?? "").trim().toLowerCase();
}

function handleFromEmail(email: string) {
  const [local] = email.split("@");
  const cleaned = (local || "user").replace(/[^a-z0-9_]+/gi, "").slice(0, 30);
  return cleaned ? `@${cleaned}` : "@user";
}

export default async function Page({ params }: { params: { email: string } }) {
  const raw = safeDecode(String(params?.email ?? ""));
  const email = normEmail(raw);

  // IMPORTANT: never call notFound() here. Render a friendly “invalid link”.
  if (!email || !email.includes("@")) {
    return (
      <FeedLayout title="Profile" subtitle="Invalid link">
        <div className="p-6 text-white/70">Invalid profile link.</div>
      </FeedLayout>
    );
  }

  // Try to load profile, but failure should NEVER 404 this page.
  let data: any = null;
  try {
    const res = await fetch(`/api/profile?email=${encodeURIComponent(email)}`, { cache: "no-store" });
    if (res.ok) data = await res.json();
  } catch {}

  const profile = data?.ok ? data.profile : null;
  const posts: any[] = data?.ok ? (data.posts ?? []) : [];

  const displayName = (profile?.displayName && String(profile.displayName).trim()) || email.split("@")[0];
  const handle = (profile?.handle && String(profile.handle).trim()) || handleFromEmail(email);
  const avatarUrl = (profile?.avatarUrl && String(profile.avatarUrl).trim()) || null;

  return (
    <FeedLayout title={displayName} subtitle={handle}>
      <div className="space-y-5 pb-12">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-sm font-semibold">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (displayName || "U")[0].toUpperCase()
            )}
          </div>

          <div className="min-w-0">
            <div className="text-sm text-white/50 break-all">{email}</div>
            {profile?.bio ? (
              <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{String(profile.bio)}</p>
            ) : (
              <p className="mt-2 text-sm text-white/60">Profile bio goes here (REVOLVR-style). Keep it clean, premium, and high-signal.</p>
            )}
          </div>
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
                  <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10">
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

        {!data ? (
          <div className="text-xs text-white/40">
            Note: profile API didn’t load (still showing page so it never 404s).
          </div>
        ) : null}
      </div>
    </FeedLayout>
  );
}
