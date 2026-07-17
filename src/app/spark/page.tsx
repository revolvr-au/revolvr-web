import { redirect } from "next/navigation";

// The SPARK feed tab was removed (feat/remove-people-spark-tabs). This route is
// now a stub: any stray link or bookmark is redirected to the feed. The old
// surface (SparkContent, formerly in SparkClient.tsx) lives in git history.
// The sparks *purchase* flow is unaffected and still lives at /spark/buy,
// /spark/checkout and /spark/success.
export default function SparkPage() {
  redirect("/public-feed");
}
