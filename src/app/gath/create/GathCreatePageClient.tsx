"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GathWindow from "@/components/GathWindow";
import { createSupabaseBrowserClient } from "@/supabase-browser";

type SeedData = {
  trancheEventId: string;
  prefillName: string;
  prefillDescription: string;
  postId: string | null;
} | null;

export default function GathCreatePageClient({ seed }: { seed: SeedData }) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <GathWindow
      open
      onClose={() => router.back()}
      userEmail={userEmail}
      seedPostId={seed?.postId ?? null}
      prefillName={seed?.prefillName}
      prefillDescription={seed?.prefillDescription}
      seedTrancheEventId={seed?.trancheEventId ?? null}
    />
  );
}
