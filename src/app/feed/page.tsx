// src/app/feed/page.tsx
import { redirect } from "next/navigation";

export default function LegacyFeedRedirect() {
  redirect("/public-feed");
}
