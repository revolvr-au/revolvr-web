// src/app/u/[email]/page.tsx
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

function displayNameFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  const cleaned = localPart.replace(/\W+/g, " ").trim();
  if (!cleaned) return email;
  // "revolvr au" -> "revolvr au" (keep it simple for now)
  return cleaned;
}

function handleFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  return (localPart || "user").replace(/\W+/g, "").toLowerCase();
}

function isValidImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (!u) return false;
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/");
}

function PremiumAvatar({
  size,
  name,
  avatarUrl,
  tick,
}: {
  size: number;
  name: string;
  avatarUrl?: string | null;
  tick?: "blue" | "gold" | null;
}) {
  const bg = tick === "gold" ? "bg-amber-400" : "bg-blue-500";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {tick ? (
        <span
          title={tick === "gold" ? "Gold tick" : "Blue tick"}
          className={[
            "absolute -right-2 -top-2 z-20",
            "inline-flex h-[20px] w-[20px] items-center justify-center",
            "rounded-full",
            bg,
            "text-[11px] font-bold text-black",
            "shadow ring-2 ring-black/30",
          ].join(" ")}
          aria-label={tick === "gold" ? "Gold tick" : "Blue tick"}
        >
          ✓
        </span>
      ) : null}

      <div className="rv-avatar relative w-full h-full rounded-full overflow-hidden bg-white/5">
        {avatarUrl && isValidImageUrl(avatarUrl) ? (
          <Image
            src={avatarUrl}
            alt={name}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-white/70">
            {name.slice(0, 1).toUpperCase()}
          </div>
        )}

        <span className="absolute inset-0 rounded-full pointer-events-none bg-white/5 opacity-0 hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

export default async function ProfilePage({
  params,
}: {
  params: { email: string };
}) {
  // IMPORTANT: decode + normalize
  const email = decodeURIComponent(params.email || "").trim().toLowerCase();
  const displayName = displayNameFromEmail(email);
  const handle = handleFromEmail(email);

  // ✅ MVP: no DB lookup yet, no notFound()
  // Later we’ll replace this with Prisma fetch and hydrate fields.
  const profile = {
    email,
    displayName,
    handle,
    avatarUrl: null as string | null,
    tick: null as "blue" | "gold" | null,
    bio: "Profile coming online…",
    website: null as string | null,
    stats: {
      posts: 0,
      followers: 0,
      following: 0,
    },
  };

  return (
    <div className="px-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <Link
          href="/public-feed"
          className="text-sm text-white/70 hover:text-white"
        >
          ← Back
        </Link>

        {/* Hamburger placement: top-right, consistent */}
        <button
          type="button"
          className="h-10 w-10 rounded-full bg-white/5 border border-white/10 inline-flex items-center justify-center text-white/80 hover:bg-white/10"
          aria-label="Menu"
          title="Menu"
          // wire later to Command / Drawer
          onClick={() => {}}
        >
          ☰
        </button>
      </div>

      {/* Identity row */}
      <div className="mt-6 flex items-start gap-4">
        <PremiumAvatar
          size={92}
          name={profile.displayName}
          avatarUrl={profile.avatarUrl}
          tick={profile.tick}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white truncate">
              {profile.displayName}
            </h1>
          </div>

          <div className="mt-1 text-sm text-white/50 truncate">@{profile.handle}</div>
          <div className="mt-3 text-sm text-white/70">{profile.bio}</div>

          {profile.website ? (
            <a className="mt-2 inline-block text-sm underline text-white/80" href={profile.website}>
              {profile.website}
            </a>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button className="h-10 px-4 rounded-xl bg-white text-black text-sm font-semibold">
              Follow
            </button>
            <button className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm">
              Message
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-3 text-center">
          <div className="text-lg font-semibold text-white">{profile.stats.posts}</div>
          <div className="text-xs text-white/50">posts</div>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-3 text-center">
          <div className="text-lg font-semibold text-white">{profile.stats.followers}</div>
          <div className="text-xs text-white/50">followers</div>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-3 text-center">
          <div className="text-lg font-semibold text-white">{profile.stats.following}</div>
          <div className="text-xs text-white/50">following</div>
        </div>
      </div>

      {/* “Revolvr way” content zones (placeholders for next builds) */}
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-sm text-white/80 font-medium">Highlights</div>
          <div className="mt-2 text-sm text-white/50">
            Coming next: highlight circles / premium rings / categories.
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-sm text-white/80 font-medium">Media</div>
          <div className="mt-2 text-sm text-white/50">
            Coming next: grid / reels / “Revolvr feed tiles”.
          </div>
        </div>
      </div>
    </div>
  );
}
