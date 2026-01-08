// src/app/api/admin/create-password-user/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  email?: string;
  password?: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function normalizeEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const email = v.trim().toLowerCase();
  return email.length ? email : null;
}

function normalizePassword(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const pw = v;
  return pw.length ? pw : null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const email = normalizeEmail(body.email);
    const password = normalizePassword(body.password);

    if (!email || !password) {
      return jsonError("Missing email or password", 400);
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return jsonError("Missing Supabase env vars", 500);
    }

    const supabaseAdmin = createClient(url, serviceKey);

    const { data: listData, error: listErr } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });

    if (listErr) return jsonError(listErr.message, 400);

    const user = listData.users.find(
      (u) => (u.email ?? "").toLowerCase() === email
    );
    if (!user?.id) return jsonError("User not found", 404);

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password,
        email_confirm: true,
      }
    );

    if (error) return jsonError(error.message, 400);

    return NextResponse.json(
      { ok: true, userId: data.user?.id ?? user.id },
      { status: 200 }
    );
  } catch (e: unknown) {
    return jsonError(errorMessage(e), 500);
  }
}
