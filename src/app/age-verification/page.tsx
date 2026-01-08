// src/app/age-verification/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type ApiResponse =
  | { status: "VERIFIED" | "SKIPPED" | "UNDERAGE_LOCKED"; error?: string }
  | { error: string }
  | Record<string, unknown>;

export default function AgeVerificationPage() {
  const router = useRouter();
  const [dob, setDob] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    if (!confirmed) {
      setError("You must confirm that you are 16 or older.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/age-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateOfBirth: dob, // e.g. "2005-10-12"
          confirmOver16: true,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as ApiResponse;

      const status =
        typeof (data as { status?: unknown }).status === "string"
          ? ((data as { status: string }).status as string)
          : null;

      if (status === "VERIFIED" || status === "SKIPPED") {
        router.push("/");
      } else if (status === "UNDERAGE_LOCKED") {
        router.push("/underage");
      } else if (typeof (data as { error?: unknown }).error === "string") {
        setError((data as { error: string }).error);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto mt-10 px-4">
      <h1 className="text-2xl font-semibold mb-4">Confirm your age</h1>
      <p className="mb-2">
        Revolvr is only available to people aged 16 or older. Please confirm
        your date of birth and that you are at least 16 years of age.
      </p>
      <p className="text-sm text-gray-500 mb-4">
        To comply with Australian online safety laws, Revolvr is restricted to
        people aged 16 or older in Australia. Revolvr may request additional age
        verification in the future.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date of birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>I confirm that I am 16 years of age or older.</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? "Checking…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
