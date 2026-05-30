import { redirect } from "next/navigation";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import MessagesContent from "@/components/messages/MessagesContent";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const email = await getAuthedEmailOrNull();
  if (!email) redirect("/welcome");

  return <MessagesContent meEmail={email.trim().toLowerCase()} />;
}
