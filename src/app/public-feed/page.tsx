import { isDmEnabled } from "@/lib/dm";
import { isRevolveEnabled } from "@/lib/revolve/config";
import PublicFeedClient from "./PublicFeedClient";

export default function PublicFeedPage() {
  // Flags are resolved server-side and passed in as props — the client never
  // imports @/lib/dm (which pulls in Prisma). DMs stay dark until age assurance.
  // The Revolve is off by default; dev runtime overrides apply on top (see
  // useRevolveConfig). Scoped to this discovery feed only.
  return (
    <PublicFeedClient
      dmEnabled={isDmEnabled()}
      revolveEnabled={isRevolveEnabled()}
    />
  );
}
