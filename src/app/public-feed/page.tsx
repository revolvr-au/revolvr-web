import FeedLayout from "@/components/FeedLayout";
import PublicFeedClient from "./PublicFeedClient";

export default function Page() {
  return (
    <FeedLayout>
      <PublicFeedClient />
    </FeedLayout>
  );
}