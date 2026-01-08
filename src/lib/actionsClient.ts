export async function createTip(input: {
  postId: string;
  creatorEmail: string; // or creatorId later
  amountCents: number;
}) {
  const res = await fetch("/api/actions/tip", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = (json && typeof json.error === "string") ? json.error : "Tip failed.";
    throw new Error(msg);
  }

  return json as { ok: true; tipId: string };
}
