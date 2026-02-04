import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function redact(url: string) {
  try {
    const u = new URL(url);
    // remove creds
    u.username = u.username ? "user" : "";
    u.password = u.password ? "pass" : "";
    return {
      protocol: u.protocol,
      host: u.hostname,
      port: u.port || null,
      db: u.pathname.replace("/", "") || null,
      search: u.search, // safe; contains sslmode/pgbouncer flags
    };
  } catch (e) {
    return { parseError: String(e), rawPrefix: url.slice(0, 30) };
  }
}

export async function GET() {
  const db = process.env.DATABASE_URL || "";
  return NextResponse.json({
    hasDatabaseUrl: Boolean(db),
    databaseUrl: db ? redact(db) : null,
    nodeOptions: process.env.NODE_OPTIONS || null,
    nodeExtraCACerts: process.env.NODE_EXTRA_CA_CERTS || null,
  });
}
