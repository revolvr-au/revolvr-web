// Server-side gate for /tranche: unauthenticated visitors land on /tranche/landing.
// Authenticated visitors get the feed rendered by TabShell.
import { redirect } from "next/navigation";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function TranchePage() {
  const email = await getAuthedEmailOrNull();
  if (!email) redirect("/tranche/landing");
  return null;
}
