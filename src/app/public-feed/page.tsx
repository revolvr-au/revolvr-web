"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";
import { FloatingLiveButton } from "@/components/FloatingLiveButton";  // ✅ make sure this is here

// ... all your types (Post, Person, etc.) ...

export default function PublicFeedPage() {
  const router = useRouter();

  // all your existing state + effects + functions:
  // const [posts, setPosts] = useState<Post[]>([]);
  // const [userEmail, setUserEmail] = useState<string | null>(null);
  // ...
  // the big return goes at the end:

  return (
    <>
      <div className="min-h-screen bg-[#050814] text-white flex flex-col">
        {/* 🔹 everything you already have: header, posts, nav, sheets, etc. */}
        {/* The outermost div is exactly what you already posted. */}
      </div>

      {/* 🔴 Floating Go Live button, always rendered on this page */}
      <FloatingLiveButton />
    </>
  );
}
