export const dynamic = "force-dynamic";

import { PublicFeedClient } from "@/app/public-feed/PublicFeedClient";
import PeopleRail from "@/components/peoplerail/PeopleRail";

export default function PublicFeedPage() {
  return (
    <div style={{ display: "flex", height: "100vh", width: "100%" }}>

      <PeopleRail userId="7cfa6dee-f62e-450a-ba39-56d37a2d9652" />

      <div style={{ flex: 1 }}>
        <PublicFeedClient />
      </div>

    </div>
  );
}