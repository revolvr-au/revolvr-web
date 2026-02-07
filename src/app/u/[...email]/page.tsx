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
  // Next 15/16 can deliver params as a Promise in server components
  params: Promise<{ email?: string | string[] }>;
}) {
  const p = await params;

  const emailParam = p?.email;
  const raw = Array.isArray(emailParam) ? emailParam.join("/") : String(emailParam ?? "");
  const decoded = decodeURIComponent(raw).trim().toLowerCase();

  // ✅ TEMP DEBUG: show exactly what we received
  const debug = {
    receivedParams: p,
    emailParamType: Array.isArray(emailParam) ? "array" : typeof emailParam,
    raw,
    decoded,
  };

  // If we *still* don't have decoded, then params are not coming through.
  if (!decoded) {
    return (
      <FeedLayout title="Revolvr" subtitle="Profile" showMenu={false}>
        <div className="px-4 py-10">
          <div className="text-lg font-semibold text-white">Profile not found.</div>
          <pre className="mt-4 text-xs text-white/70 whitespace-pre-wrap">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </div>
      </FeedLayout>
    );
  }

  const displayName = displayNameFromEmail(decoded);
  const handle = handleFromEmail(decoded);

  return (
    <FeedLayout
      title={displayName}
      subtitle={handle}
      showMenu
      onMenuClick={() => {}}
    >
      <div className="px-4 sm:px-6 pb-20">
        {/* debug block visible for now */}
        <pre className="mb-4 text-xs text-white/40 whitespace-pre-wrap">
          {JSON.stringify(debug, null, 2)}
        </pre>

        {/* your existing UI can come back after we solve the params */}
        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-white/80">✅ Params decoded correctly.</div>
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
      </div>
    </FeedLayout>
  );
}
