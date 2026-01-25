"use client";

import { useRouter } from "next/navigation";

export default function PaymentsPage() {
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

        <h1 className="text-2xl font-semibold">Payments & Refunds</h1>
        <p className="mt-2 text-sm text-white/70 leading-6">
          This page explains how payments work on Revolvr.
        </p>

        <div className="mt-6 space-y-4 text-sm text-white/80 leading-6">
          <section>
            <div className="font-semibold">Payment processing</div>
            <div>Payments may be processed by third-party providers such as Stripe, Apple App Store, or Google Play.</div>
          </section>

          <section>
            <div className="font-semibold">Receipts and records</div>
            <div>We may retain transaction records for legal, security, fraud prevention, and compliance purposes.</div>
          </section>

          <section>
            <div className="font-semibold">Refunds</div>
            <div>
              Refunds are handled in line with applicable consumer laws and the policies of the payment provider used for the transaction.
              If you believe a payment was made in error, contact Support as soon as possible.
            </div>
          </section>

          <section>
            <div className="font-semibold">Support</div>
            <div>
              Contact: <a href="/support" className="underline hover:text-white/90">Support</a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
