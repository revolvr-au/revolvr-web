"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatorOnboardPage() {
  const router = useRouter();

  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const onActivate = async () => {
    const h = handle.trim();
    if (h.length < 3) {
      setStatus("error");
      setMessage("Handle must be at least 3 characters.");
      return;
    }

    try {
      setStatus("saving");
      setMessage("");

      const res = await fetch("/api/creator/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // cookie auth
        credentials: "include",
        body: JSON.stringify({
          handle: h,
          displayName: displayName.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setStatus("error");
        setMessage(text || "Could not activate creator.");
        return;
      }

      router.replace("/creator/dashboard");
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message || "Something went wrong.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-xl border bg-white p-6">
        <h1 className="text-xl font-semibold">Creator onboarding</h1>
        <p className="mt-2 text-sm text-gray-600">
          Set your creator handle to activate your creator account.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-900">Handle</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="e.g. westley"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900">Display name (optional)</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="e.g. Westley"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="off"
            />
          </div>

          {message && (
            <p className="text-sm text-red-600 whitespace-pre-wrap">{message}</p>
          )}

          <button
            type="button"
            className="mt-2 w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
            disabled={status === "saving"}
            onClick={onActivate}
          >
            {status === "saving" ? "Activating…" : "Activate creator"}
          </button>

          <button
            type="button"
            className="w-full rounded-lg border px-4 py-2 text-sm"
            onClick={() => router.replace("/login?redirectTo=/creator/onboard")}
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
