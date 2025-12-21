import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        {
          loggedIn: false,
          creator: {
            'Active': false,
            handle: null,
            stripeOnboardingComplete: false,
          },
        },
        { status: 200 }
      );
    }

    const email = (user.email ?? "").trim().toLowerCase();

    const profile = email
      ? await prisma.creatorProfile.findUnique({ where: { email } })
      : null;

    const balance = email
      ? await prisma.creatorBalance.findUnique({ where: { creatorEmail: email } })
      : null;

    return NextResponse.json(
      {
        loggedIn: true,
        user: { id: user.id, email: email || null },
        creator: {
          Active: Boolean(profile?.Active),
          handle: profile?.handle ?? null,
          stripeOnboardingComplete: Boolean(profile?.stripeOnboardingComplete),
        },
        profile,
        balance:
          balance ??
          (email
            ? { creatorEmail: email, totalEarnedCents: 0, availableCents: 0 }
            : null),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("[api/creator/me] error", e);
    return NextResponse.json(
      {
        loggedIn: false,
        creator: {
          Active: false,
          handle: null,
          stripeOnboardingComplete: false,
        },
        error: "Server error",
      },
      { status: 500 }
    );
  }
}
