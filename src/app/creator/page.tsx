import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export default async function CreatorEntryPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    redirect("/login?redirectTo=/creator&error=missing_env");
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // Server components should not set cookies; callback route already did.
      setAll() {},
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  const email = user?.email ? String(user.email).trim().toLowerCase() : "";

  if (!email) {
    redirect("/login?redirectTo=/creator");
  }

  const isCreator = Boolean((user?.user_metadata as any)?.is_creator);

  // If they are not activated as a creator, send them to onboarding.
  if (!isCreator) {
    redirect("/creator/onboard");
  }

  // Start a new live session (launch-safe: sessionId is generated server-side)
  const sessionId = randomUUID();
  redirect(`/live/${encodeURIComponent(sessionId)}?creator=${encodeURIComponent(email)}`);
}
