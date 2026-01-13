import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function CreatorDashboardPage() {
  // Single entrypoint: /creator decides login vs /u/<email>
  redirect("/creator");
}
