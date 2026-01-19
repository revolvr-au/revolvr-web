import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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
      setAll() {},
    },
  });

  const { data } = await supabase.auth.getUser();
  const email = data?.user?.email;

  if (!email) {
    redirect("/login?redirectTo=/creator");
  }

  redirect(`/u/${encodeURIComponent(String(email).trim().toLowerCase())}`);
}
