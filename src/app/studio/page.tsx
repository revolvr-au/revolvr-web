"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";
import { isAdminEmail } from "@/lib/isAdmin";
import StudioDashboard from "./StudioDashboard";

const supabase = createSupabaseBrowserClient();

export default function StudioPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const userEmail = data.session?.user?.email ?? null;
      if (!userEmail || !isAdminEmail(userEmail)) {
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
