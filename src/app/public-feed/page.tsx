export const dynamic = "force-dynamic";

import { PublicFeedClient } from "@/app/public-feed/PublicFeedClient";
import PeopleRail from "@/components/peoplerail/PeopleRail";

export default function PublicFeedPage() {

  return (
    <div style={{ display: "flex" }}>

      <PeopleRail />

      <div style={{ flex: 1 }}>
        <PublicFeedClient />
      </div>

    </div>
  );
}