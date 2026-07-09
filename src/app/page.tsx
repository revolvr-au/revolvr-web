import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/dm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/welcome");

  // Key the profile lookup with the SAME normalizer the write paths use
  // (profile/setup + age-verification write under normalizeEmail(...)). A raw
  // user.email here would miss an already-onboarded user's row on any casing
  // mismatch and loop them back to /onboard. Read-key MUST equal write-key.
  const email = normalizeEmail(user.email ?? "");

  const [profile, creator] = await Promise.all([
    prisma.profiles.findUnique({ where: { email }, select: { display_name: true } }),
    prisma.creatorProfile.findUnique({ where: { email }, select: { handle: true } }),
  ]);

  const hasProfile = !!(profile?.display_name?.trim() || creator?.handle?.trim());
  if (!hasProfile) redirect("/onboard");
  redirect("/public-feed");
}
