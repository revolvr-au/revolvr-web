"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";
import { isAdminEmail } from "@/lib/isAdmin";
import StudioDashboard from "./StudioDashboard";

const supabase = createSupabaseBrowserClient();

export default function StudioPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userEmail = data.user?.email ?? null;
      console.log("[studio] getUser email:", userEmail);
      if (!userEmail || !isAdminEmail(userEmail)) {
        console.log("[studio] not admin, redirecting");
        router.replace("/");
      } else {
        setEmail(userEmail);
      }
    });
  }, [router]);

  if (email === undefined) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050814",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          fontFamily: "sans-serif",
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }

  return <StudioDashboard email={email} />;
}
