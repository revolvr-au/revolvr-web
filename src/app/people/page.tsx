import { redirect } from "next/navigation";

// The PEOPLE tab was removed (feat/remove-people-spark-tabs). This route is now
// a stub: any stray link or bookmark is redirected to the feed. The old surface
// (PeoplePageContent + the GATHS browse sub-tab) lives in git history if it needs
// to be restored. NOTE: this page's "GATHS" sub-tab was the platform's only
// gath-discovery/browse surface — removing it leaves GATH without a discovery
// entry point (post-launch: needs a dedicated /gath index or a feed home).
export default function PeoplePage() {
  redirect("/public-feed");
}
