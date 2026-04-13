import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";

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

  const email = user.email ?? "";
  const [profile, creator] = await Promise.all([
    prisma.profiles.findUnique({ where: { email }, select: { display_name: true } }),
    prisma.creatorProfile.findUnique({ where: { email }, select: { handle: true } }),
  ]);

  console.log("EMAIL:", email);
  console.log("PROFILE:", JSON.stringify(profile));
  console.log("CREATOR:", JSON.stringify(creator));

  const hasHandle = !!(profile?.display_name?.trim() || creator?.handle?.trim());
  console.log("HAS HANDLE:", hasHandle);

  if (!hasHandle) redirect("/onboard");
  redirect("/public-feed");
}
