import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const raw = process.env.DATABASE_URL || "";

  let parsed: any = null;
  try {
    const u = new URL(raw);
    parsed = {
      protocol: u.protocol,
      host: u.hostname,
      port: u.port || null,
      database: u.pathname.replace("/", "") || null,
      query: u.search,
    };
  } catch {
    parsed = null;
  }

  return NextResponse.json({
    hasDatabaseUrl: Boolean(raw),
    databaseUrl: parsed,
    nodeOptions: process.env.NODE_OPTIONS || null,
    nodeExtraCACerts: process.env.NODE_EXTRA_CA_CERTS || null,
  });
}
