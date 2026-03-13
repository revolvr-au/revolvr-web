export const dynamic = "force-dynamic";

import { PublicFeedClient } from "@/app/public-feed/PublicFeedClient";
import PeopleRail from "@/components/peoplerail/PeopleRail";

export default function PublicFeedPage() {
  return (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "90px 1fr",
      height: "100vh",
      width: "100%",
      overflow: "hidden"
    }}
  >
    <PeopleRail userId="7cfa6dee-f62e-450a-ba39-56d37a2d9652" />

    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden"
      }}
    >
      <PublicFeedClient />
    </div>
  </div>
)
}