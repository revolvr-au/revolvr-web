// src/app/u/[...email]/page.tsx
import Link from "next/link";
import FeedLayout from "@/components/FeedLayout";

function displayNameFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  const cleaned = localPart.replace(/\W+/g, " ").trim();
  return cleaned || email;
}

function handleFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  const cleaned = localPart.replace(/\W+/g, "").trim().toLowerCase();
  return cleaned ? `@${cleaned}` : "@creator";
}

export default async function ProfilePage({
  params,
}: {
  // In Next App Router, params is usually an object,
  // but we’ll defensively support the “Promise params” case too.
  params: { email?: string | string[] } | Promise<{ email?: string | string[] }>;
}) {
  const p = await Promise.resolve(params);

  const emailParam = (p as any)?.email;

  // Catch-all route: emailParam is typically string[]
  const parts =
    Array.isArray(emailParam) ? emailParam : typeof emailParam === "string" ? [emailParam] : [];

  // Join any segments (handles rare cases where email is split)
  const raw = parts.join("/");

  // Decode %40 etc.
  const decoded = decodeURIComponent(raw || "").trim().toLowerCase();

  const debug = {
    receivedParams: p,
    emailParam,
    emailParamType: Array.isArray(emailParam) ? "array" : typeof emailParam,
    parts,
    raw,
    decoded,
    hrefExample: `/u/${encodeURIComponent(decoded || "revolvr.au@gmail.com")}`,
  };

  const displayName = decoded ? displayNameFromEmail(decoded) : "Revolvr";
  const handle = decoded ? handleFromEmail(decoded) : "Profile";

  return (
    <FeedLayout title={displayName} subtitle={handle} showMenu>
      <div className="px-4 sm:px-6 pb-20">
        {/* DEBUG (leave this in until fixed in prod) */}
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold text-white/80">/u/[...email] debug</div>
          <pre className="mt-3 text-xs text-white/60 whitespace-pre-wrap">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </div>

        {!decoded ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-lg font-semibold text-white">Profile not found.</div>
            <div className="mt-2 text-sm text-white/60">
              Params are coming through empty — the debug block above tells us why.
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                href="/public-feed"
                className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition"
              >
                ← Back
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-white/80">✅ Params decoded correctly:</div>
            <div className="mt-2 text-white/60">{decoded}</div>

            <div className="mt-4 flex gap-2">
              <Link
                href="/public-feed"
                className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition"
              >
                ← Back
              </Link>
            </div>
          </div>
        )}
      </div>
    </FeedLayout>
  );
}
