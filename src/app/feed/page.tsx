import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";  // <---- CRITICAL

export default function LegacyFeedRedirect() {
  redirect("/public-feed");
}
