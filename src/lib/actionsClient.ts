// src/lib/actionsClient.ts
"use client";

export async function createTip(input: {
  postId: string;
  creatorEmail: string; // later: creatorId
  amountCents: number;
}) {
  const res = await fetch("/api/actions/tip", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    // credentials: "same-origin", // optional; default in browsers is usually fine
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      json && typeof (json as any).error === "string"
        ? (json as any).error
        : "Tip failed.";
    throw new Error(msg);
  }

  return json as { ok: true; tipId: string };
}
