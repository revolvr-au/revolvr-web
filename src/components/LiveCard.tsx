"use client";

import { useRouter } from "next/navigation";

type Props = {
  creatorName: string;
  sessionId: string;
};

export default function LiveCard({ creatorName, sessionId }: Props) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/live/${sessionId}`)}
      className="
        mb-6 cursor-pointer rounded-2xl
        border border-red-500/20
        bg-gradient-to-br from-red-500/5 via-white/5 to-white/5
        backdrop-blur-md
        p-5
        transition
        hover:border-red-500/40
        hover:shadow-[0_0_40px_rgba(255,0,85,0.25)]
      "
    >
      <div className="flex items-center justify-between">
        <div className="text-lg font-medium">
          {creatorName}
          <span className="ml-2 text-white/70">is</span>
          <span className="ml-2 text-red-500 font-semibold animate-pulse">
            LIVE
          </span>
        </div>

        <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
      </div>

      <div className="mt-2 text-sm text-white/50">
        Tap to join the broadcast
      </div>
    </div>
  );
}