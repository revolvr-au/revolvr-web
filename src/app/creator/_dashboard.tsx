import { SUPPORT_EMAIL } from "@/lib/constants";

export default function CreatorDashboard({
  me,
}: {
  me: {
    profile: any;
    balance: { totalEarnedCents: number; availableCents: number };
  };
}) {
  const total = (me.balance?.totalEarnedCents ?? 0) / 100;
  const available = (me.balance?.availableCents ?? 0) / 100;

  const displayName = me.profile?.displayName || me.profile?.display_name || "Creator";
  const handle = me.profile?.handle ? `@${me.profile.handle}` : "";

  return (
    <div className="min-h-screen p-6 space-y-6">
      <header>
        <div className="text-2xl font-semibold">{displayName}</div>
        <div className="text-sm opacity-70">{handle}</div>
        <div className="mt-2 inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-200">
          Active creator
        </div>
      </header>

      <section className="rounded-xl bg-white/5 p-4">
        <div className="text-sm font-semibold">Earnings</div>
        <div className="mt-3 text-sm">Total earned: ${total.toFixed(2)}</div>
        <div className="text-sm">Available: ${available.toFixed(2)}</div>
        <div className="mt-3 text-xs opacity-70">
          First payout can take up to 21 days. After your first payout, we aim for ~7 days or sooner.
        </div>
      </section>

      <section className="rounded-xl bg-white/5 p-4">
        <div className="text-sm font-semibold">Support</div>
        <div className="mt-2 text-sm opacity-70">
          Issues? Email{" "}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </div>
      </section>
    </div>
  );
}
