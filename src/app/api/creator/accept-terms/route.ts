import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";

const CREATOR_TERMS_VERSION = "v1.0-2026-01-27";

function safeReturnTo(raw: string | null) {
  const fallback = "/creator/onboard";
  if (!raw) return fallback;
  const v = String(raw).trim();
  // allow only in-app relative paths
  if (!v.startsWith("/")) return fallback;
  if (v.startsWith("//")) return fallback;
  if (v.includes("://")) return fallback;
  return v;
}

export async function POST(req: Request) {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json({ ok: false, error: "missing_supabase_env" }, { status: 500 });
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const email = String(data.user.email).trim().toLowerCase();
  const now = new Date();

  const result = await prisma.creatorProfile.updateMany({
    where: { email, creatorTermsAccepted: false },
    data: {
      creatorTermsAccepted: true,
      creatorTermsAcceptedAt: now,
      creatorTermsVersion: CREATOR_TERMS_VERSION,
    },
  });

  let returnTo: string | null = null;
  try {
    const url = new URL(req.url);
    returnTo = url.searchParams.get("returnTo");
  } catch {}

  if (!returnTo) {
    const body = await req.json().catch(() => null);
    returnTo = body?.returnTo ? String(body.returnTo) : null;
  }

  const redirectTo = safeReturnTo(returnTo);

  return NextResponse.json({ ok: true, updated: result.count, redirectTo });
}
