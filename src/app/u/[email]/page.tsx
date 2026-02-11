import { notFound } from "next/navigation";

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

async function getProfile(email: string) {
  // Use relative URL so it works on Vercel automatically
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

  const handle =
    (profile?.handle && String(profile.handle).trim()) || `@${email.split("@")[0]}`;

  const displayName =
    (profile?.displayName && String(profile.displayName).trim()) || email.split("@")[0];

  const avatarUrl =
    (profile?.avatarUrl && String(profile.avatarUrl).trim()) || null;

  return (
    <main className="mx-auto max-w-screen-sm p-6 text-white">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 rounded-full overflow-hidden bg-white/10 flex items-center justify-center font-semibold">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (displayName || "u")[0].toUpperCase()
          )}
        </div>

        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">{displayName}</h1>
          <p className="text-sm text-white/50 truncate">{handle}</p>
          <p className="text-[12px] text-white/30 truncate">{email}</p>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-white/80">Posts</h2>

        {!posts.length ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
            No posts yet.
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {posts.map((p: any) => {
              const img =
                (p?.media?.length && p.media[0]?.url) || p?.imageUrl || null;

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
    </main>
  );
}
