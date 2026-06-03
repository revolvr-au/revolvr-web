import { notFound, redirect } from "next/navigation";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { isDmEnabled } from "@/lib/dm";
import MessagesContent from "@/components/messages/MessagesContent";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  // DMs are dark until age assurance is real — see isDmEnabled().
  if (!isDmEnabled()) notFound();
  const email = await getAuthedEmailOrNull();
  if (!email) redirect("/welcome");

  return <MessagesContent meEmail={email.trim().toLowerCase()} />;
}
