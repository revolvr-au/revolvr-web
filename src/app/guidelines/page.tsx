"use client";

import { useRouter } from "next/navigation";

export default function GuidelinesPage() {
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

        <h1 className="text-2xl font-semibold">Community Guidelines</h1>
        <p className="mt-2 text-sm text-white/70 leading-6">
          Revolvr is built for professional, safe engagement between Brands and Creators.
          By using the Platform you agree to follow these rules.
        </p>

        <div className="mt-6 space-y-4 text-sm text-white/80 leading-6">
          <section>
            <div className="font-semibold">No harassment or hate</div>
            <div>Harassment, threats, hate speech, or targeted abuse are prohibited.</div>
          </section>

          <section>
            <div className="font-semibold">No scams or fraud</div>
            <div>Do not attempt to deceive users, solicit money off-platform dishonestly, or impersonate payment flows.</div>
          </section>

          <section>
            <div className="font-semibold">No impersonation</div>
            <div>Do not pretend to be another person, brand, or organisation.</div>
          </section>

          <section>
            <div className="font-semibold">No illegal or exploitative content</div>
            <div>Content that is illegal, exploitative, or harmful is not permitted.</div>
          </section>

          <section>
            <div className="font-semibold">Minors</div>
            <div>Revolvr is intended for users 13 years of age and older. Some features (including payments and certain creator tools) are available only to users 18+.</div>
          </section>

          <section>
            <div className="font-semibold">Reporting</div>
            <div>
              If you feel unsafe or see a violation, report it via{" "}
              <a href="/report" className="underline hover:text-white/90">/report</a>.
            </div>
          </section>

          <section>
            <div className="font-semibold">Enforcement</div>
            <div>We may remove content, restrict access, or suspend accounts to maintain platform safety.</div>
          </section>
        </div>
      </div>
    </main>
  );
}
