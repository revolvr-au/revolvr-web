import { redirect } from "next/navigation";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/isAdmin";
import StudioDashboard from "./StudioDashboard";

export default async function StudioPage() {
  let email: string | null = null;

  try {
    email = await getAuthedEmailOrNull();
  } catch (e) {
    console.error("Studio auth error:", e);
  }

  if (!email) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050814",
          padding: 24,
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ color: "#ef4444", fontSize: 14 }}>
          Auth failed — check session / cookies / supabaseServer
        </div>
      </div>
    );
  }

  if (!isAdminEmail(email)) {
    redirect("/");
  }

  return <StudioDashboard email={email} />;
}
