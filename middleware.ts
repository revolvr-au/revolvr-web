// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function createMiddlewareSupabaseClient(req: NextRequest) {
  // Response that Supabase will attach refreshed auth cookies to
  const res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return { supabase, res };
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Don't apply age-gate on these paths
  const isAgePage = pathname.startsWith('/age-verification');
  const isUnderagePage = pathname.startsWith('/underage');
  const isAuthPage =
    pathname.startsWith('/login') || pathname.startsWith('/signup');

  if (isAgePage || isUnderagePage || isAuthPage) {
    // Let these through without checks
    return NextResponse.next();
  }

  const { supabase, res } = createMiddlewareSupabaseClient(req);

  // 1) Get the current Supabase user (from cookies)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in → no age gate (you can tighten this later if you want)
  if (!user) {
    return res;
  }

  // 2) Load this user's profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('country, is_age_verified, underage_locked')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    // If we can't read profile, don't block the user
    return res;
  }

  // 3) Only apply gate to Australian users
  if (profile.country !== 'AU') {
    return res;
  }

  // 4) Enforce lock & verification

  // Underage users are always sent to /underage
  if (profile.underage_locked) {
    if (!isUnderagePage) {
      const url = req.nextUrl.clone();
      url.pathname = '/underage';
      return NextResponse.redirect(url);
    }
    return res;
  }

  // AU + not yet verified → must go to /age-verification
  if (!profile.is_age_verified) {
    const url = req.nextUrl.clone();
    url.pathname = '/age-verification';
    return NextResponse.redirect(url);
  }

  // 5) AU + verified → normal access
  return res;
}

// Run middleware on all non-static, non-API routes
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
