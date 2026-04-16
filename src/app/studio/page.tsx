import { redirect } from "next/navigation";
import UsersPanel from "@/components/studio/UsersPanel";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/isAdmin";

export default async function StudioPage() {
  let email: string | null = null;

  try {
    email = await getAuthedEmailOrNull();
  } catch (e) {
    console.error("Studio auth error:", e);
  }

  // 🔴 If auth fails, SHOW something instead of blank page
  if (!email) {
    return (
      <div className="min-h-screen bg-[#050814] p-6 text-white" style={{ color: "#fff" }}>
        <h1 className="text-lg font-semibold mb-4">REVOLVR Studio</h1>
        <div className="text-red-400 text-sm">
          Auth failed — check session / cookies / supabaseServer
        </div>
      </div>
    );
  }

  if (!isAdminEmail(email)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#050814] p-6 text-white" style={{ color: "#fff" }}>
      <h1 className="mb-6 text-xl font-semibold tracking-wide">
        REVOLVR Studio
      </h1>

      {/* 🔍 Debug line (remove later) */}
      <div className="mb-4 text-xs text-white/40">
        Logged in as: {email}
      </div>

      <div className="grid gap-6">

  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white">
    <div className="mb-2 text-sm text-white/60">Feed State</div>

    <div className="flex justify-between text-sm">
      <span>Momentum</span>
      <span>Active</span>
    </div>

    <div className="mt-1 flex justify-between text-sm">
      <span>Top Cluster</span>
      <span>Dynamic</span>
    </div>
  </div>

  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white">
    <div className="mb-2 text-sm text-white/60">
      Top Posts (Live)
    </div>

    <div className="text-sm text-white/80">Loading...</div>
  </div>

  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white">
    <div className="mb-2 text-sm text-white/60">
      Engagement
    </div>

    <div className="text-sm text-white">
      Interaction rate stabilising
    </div>
  </div>

  <UsersPanel />

</div>
    </div>
  );
}