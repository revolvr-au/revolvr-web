// src/app/feed/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic"; // 👈 IMPORTANT

export default function LegacyFeedRedirect() {
  redirect("/public-feed");
}
