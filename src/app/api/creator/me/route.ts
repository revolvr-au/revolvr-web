import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";

function supabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In a Route Handler we can set cookies on the response.
          // Supabase may request setting cookies during token refresh.
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function GET() {
  try {
    const supabase = supabaseServer();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Not logged in (or session invalid)
    if (error || !user) {
      return NextResponse.json(
        {
          loggedIn: false,
          creator: {
            isActive: false,
            handle: null,
            stripeOnboardingComplete: false,
          },
        },
        { status: 200 }
      );
    }

    // Prefer user.id as the stable key; email is secondary
    const email = (user.email ?? "").trim().toLowerCase();

    // Your Prisma models appear to be creatorProfile + creatorBalance.
    // We look up by email because that’s what your schema currently uses.
    // (If you have userId in Prisma, switch to userId immediately.)
    const profile = email
      ? await prisma.creatorProfile.findUnique({ where: { email } })
      : null;

    // Balance is OPTIONAL. Never block creator identity on it.
    const balance = email
      ? await prisma.creatorBalance.findUnique({ where: { creatorEmail: email } })
      : null;

    return NextResponse.json(
      {
        loggedIn: true,
        user: {
          id: user.id,
          email: email || null,
        },
        creator: {
          isActive: Boolean(profile?.isActive),
          handle: profile?.handle ?? null,
          stripeOnboardingComplete: Boolean(profile?.stripeOnboardingComplete),
        },
        // keep these for your dashboard
        profile,
        balance:
          balance ?? (email ? { creatorEmail: email, totalEarnedCents: 0, availableCents: 0 } : null),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("[api/creator/me] error", e);
    return NextResponse.json(
      {
        loggedIn: false,
        creator: {
          isActive: false,
          handle: null,
          stripeOnboardingComplete: false,
        },
        error: "Server error",
      },
      { status: 500 }
    );
  }
}
