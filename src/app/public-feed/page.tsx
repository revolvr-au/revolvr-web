import dynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const PublicFeedClient = dynamic(
  () => import("./PublicFeedClient"),
  { ssr: false }
);

export default function PublicFeedPage() {
  return <PublicFeedClient />;
}