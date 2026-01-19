import Link from "next/link";
import FrontGateSocialStack from "@/components/FrontGateSocialStack";

export default function FrontGatePage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#05070C] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/60" />
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[-160px] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-400/12 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-10 px-5 py-10 md:grid-cols-2 md:py-0">
        {/* LEFT: Atmosphere (desktop only) */}
        <div className="relative hidden md:block">
          <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-black/10 backdrop-blur-[2px]" />
          <div className="relative h-[560px] w-full overflow-hidden rounded-[36px] border border-white/10 bg-white/5">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[680px] w-[420px] -translate-x-1/2 -translate-y-1/2 opacity-30 blur-[3px]">
              <DesktopCard className="absolute left-[-40px] top-[70px] rotate-[-10deg] opacity-35" />
              <DesktopCard className="absolute right-[-30px] top-[40px] rotate-[8deg] opacity-55" />
              <DesktopCard className="absolute left-[10px] top-[160px] rotate-[-3deg] opacity-75" />
            </div>

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black/50" />

            <div className="relative z-10 p-8">
              <div className="text-sm text-white/60">Live support. Real momentum.</div>
              <div className="mt-2 text-[22px] font-semibold tracking-tight text-white/85">
                Something is unfolding live.
              </div>
              <div className="mt-2 max-w-sm text-sm leading-relaxed text-white/55">
                Step into what’s happening now — watch or go live in seconds.
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: The Door */}
        <div className="relative mx-auto w-full max-w-[440px] md:mx-0 md:justify-self-end">
          {/* MOBILE STACK */}
          <div className="relative mx-auto mb-4 h-[22vh] w-full max-w-md overflow-hidden md:hidden">
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/0 via-black/0 to-[#05070C]" />

            <div className="absolute left-[6%] top-[0%] w-[70%] rotate-[-7deg] opacity-12 blur-[1.5px]">
              <MobileCard name="Mila" status="support rolling" />
            </div>
            <div className="absolute right-[4%] top-[-6%] w-[72%] rotate-[7deg] opacity-18 blur-[1.5px]">
              <MobileCard name="Jordan" status="boosted" />
            </div>
            <div className="absolute left-1/2 top-[4%] w-[74%] -translate-x-1/2 rotate-[2deg] opacity-32 blur-[0.5px]">
              <MobileCard name="Kai" status="momentum building" prominent />
            </div>
          </div>

          {/* Glass decision panel */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -top-12 left-1/2 h-[240px] w-[240px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
              <FrontGateSocialStack />
              <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/35" />
            </div>

            <div className="rounded-[32px] bg-black/30 px-6 py-6 backdrop-blur-md ring-1 ring-white/12 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
              <div className="text-center">
                <div className="text-[32px] font-semibold tracking-tight md:text-[40px]">
                  Revolvr
                </div>
                <div className="mt-2 text-[17px] leading-snug text-white/90 md:text-[19px]">
                  Live support. Real momentum.
                </div>
                <div className="mt-1 text-[13px] leading-snug text-white/60 md:text-[14px]">
                  Join what’s happening live — or go live in seconds.
                </div>
              </div>

              <div className="mt-5">
                <Link
                  href="/live"
                  className="block w-full rounded-2xl bg-gradient-to-r from-emerald-300 to-emerald-400 px-5 py-4 text-center text-[16px] font-semibold text-black shadow-[0_0_44px_rgba(52,211,153,0.22)] transition hover:brightness-105 active:scale-[0.99]"
                  aria-label="Watch Live"
                >
                  Watch Live
                </Link>

                <Link
                  href="/create"
                  className="mt-3 block w-full rounded-2xl px-5 py-3 text-center text-[14px] font-medium text-white/70 transition hover:text-white/85 active:scale-[0.99]"
                  aria-label="Go live as a creator"
                >
                  Go Live as a Creator
                </Link>

                <div className="mt-5 text-center text-[13px] text-white/55">
                  Creators earn <span className="font-semibold text-white/85">45%</span> on all tips, boosts, and spins.
                </div>

                <div className="mt-4 flex items-center justify-center gap-2 text-[13px] text-white/55">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  <span>37 people live right now</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none mt-6 h-10 w-full bg-gradient-to-b from-transparent to-black/10 md:hidden" />
        </div>
      </div>
    </div>
  );
}

function MobileCard({
  name,
  status,
  prominent = false,
}: {
  name: string;
  status: string;
  prominent?: boolean;
}) {
  return (
    <div className="relative aspect-[9/16] rounded-[18px] border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm animate-floatSoft">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-black/35 px-3 py-1 text-[12px] text-white/85">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          LIVE
        </div>
        <div
          className={[
            "rounded-full px-3 py-1 text-[12px]",
            prominent ? "bg-emerald-400/15 text-emerald-200" : "bg-black/25 text-white/70",
          ].join(" ")}
        >
          {status}
        </div>
      </div>

      <div className="mt-4 px-4">
        <div className="h-44 w-full rounded-2xl bg-gradient-to-b from-white/10 to-white/0" />
        <div className="mt-4 h-3 w-2/3 rounded-full bg-white/10" />
        <div className="mt-2 h-3 w-1/2 rounded-full bg-white/10" />
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <div className="text-[13px] font-medium text-white/85">{name}</div>
        <div className="text-[12px] text-white/55">support is live</div>
      </div>

      <style>{`
        @keyframes floatSoft {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-floatSoft { animation: floatSoft 7.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function DesktopCard({ className }: { className?: string }) {
  return (
    <div
      className={[
        "relative h-[640px] w-[360px] rounded-[26px] border border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(0,0,0,0.6)] backdrop-blur-sm",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-black/35 px-3 py-1 text-[12px] text-white/85">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          LIVE
        </div>
        <div className="rounded-full bg-black/25 px-3 py-1 text-[12px] text-white/70">
          support rolling
        </div>
      </div>

      <div className="mt-6 px-5">
        <div className="h-[260px] w-full rounded-3xl bg-gradient-to-b from-white/10 to-white/0" />
        <div className="mt-6 h-3 w-2/3 rounded-full bg-white/10" />
        <div className="mt-3 h-3 w-1/2 rounded-full bg-white/10" />
        <div className="mt-3 h-3 w-3/5 rounded-full bg-white/10" />
      </div>
    </div>
  );
}
