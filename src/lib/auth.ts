import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireUserEmail() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  const email = data.user?.email ?? null;
  if (error || !email) {
    return { ok: false as const, status: 401 as const, email: null };
  }

  return { ok: true as const, status: 200 as const, email };
}
