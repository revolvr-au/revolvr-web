import { isDmEnabled } from "@/lib/dm";
import PublicFeedClient from "./PublicFeedClient";

export default function PublicFeedPage() {
  // Flag is resolved server-side and passed in as a prop — the client never
  // imports @/lib/dm (which pulls in Prisma). DMs stay dark until age assurance.
  return <PublicFeedClient dmEnabled={isDmEnabled()} />;
}
