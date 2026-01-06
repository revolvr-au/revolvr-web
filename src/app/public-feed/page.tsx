export const dynamic = "force-dynamic";
export const revalidate = false;

import PublicFeedClient from "./PublicFeedClient";

export default function PublicFeedPage() {
  return (
    <div className="min-h-screen bg-[#050814] text-white">
      <main className="max-w-6xl mx-auto px-4 py-6">
        <PublicFeedClient />
      </main>
    </div>
  );
}
