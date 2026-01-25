"use client";

import { useRouter } from "next/navigation";

export default function AboutPage() {
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

        <h1 className="text-2xl font-semibold">About Revolvr</h1>
        <p className="mt-2 text-sm text-white/70 leading-6">
          Revolvr is a platform that helps Brands and Creators discover, connect, and engage with each other.
        </p>

        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold text-white/90">Business</div>
          <div className="mt-1 text-sm text-white/80">Revolvr Pty Ltd (Australia)</div>
          <div className="mt-3 text-sm font-semibold text-white/90">Contact</div>
          <a
            href={`mailto:revolvrassist@gmail.com?subject=${encodeURIComponent("Revolvr Enquiry")}`}
            className="mt-1 inline-block text-sm text-white/80 underline hover:text-white/90"
          >
            revolvrassist@gmail.com
          </a>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a
            href="/terms"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
          >
            Terms & Conditions
          </a>
          <a
            href="/privacy"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </main>
  );
}
