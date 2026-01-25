"use client";

import { useRouter } from "next/navigation";

const SUPPORT_EMAIL = "revolvrassist@gmail.com";

export default function SupportPage() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 relative">
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute right-4 top-4 text-white/50 hover:text-white/80 text-sm"
          aria-label="Close"
          title="Close"
        >
          ✕
        </button>

        <h1 className="text-2xl font-semibold">Support</h1>
        <p className="mt-2 text-sm text-white/70 leading-6">
          Need help with your account, payments, or safety? Contact us and we’ll respond as soon as possible.
        </p>

        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold text-white/90">Email</div>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Revolvr Support Request")}`}
            className="mt-1 inline-block text-sm text-white/80 underline hover:text-white/90"
          >
            {SUPPORT_EMAIL}
          </a>
          <div className="mt-2 text-xs text-white/50">
            Include your account email/handle and a short description.
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a
            href="/report"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
          >
            Report a safety issue
          </a>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Revolvr Bug Report")}`}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
          >
            Report a bug
          </a>
        </div>

        <div className="mt-6 text-xs text-white/50">
          Revolvr Pty Ltd (Australia)
        </div>
      </div>
    </main>
  );
}
