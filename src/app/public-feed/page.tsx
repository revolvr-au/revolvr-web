export const dynamic = "force-dynamic";

import dynamic from "next/dynamic";

const PublicFeedClient = dynamic(
  () => import("@/app/public-feed/PublicFeedClient"),
  { ssr: false }
);

export default function PublicFeedPage() {
  return <PublicFeedClient />;
}