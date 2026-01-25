type MeResponse = {
  loggedIn?: boolean;
  user?: { email?: string | null };
};

export async function getAuthedEmailFromCreatorMe(req: Request): Promise<string | null> {
  try {
    const url = new URL("/api/creator/me", req.url);
    const cookie = req.headers.get("cookie") ?? "";
    const res = await fetch(url, {
      method: "GET",
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as MeResponse;
    const email = (data?.user?.email ?? null)?.toLowerCase() ?? null;
    return data?.loggedIn ? email : null;
  } catch {
    return null;
  }
}
