"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function LiveRoomPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();

  const safeSessionId = params?.sessionId ?? "";

  const sessionId = useMemo(() => {
    try {
      return decodeURIComponent(safeSessionId);
    } catch {
      return safeSessionId;
    }
  }, [safeSessionId]);

  const role = searchParams?.get("role") || "";
  const isHost = role === "host";

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    const simulateLoad = async () => {
      await new Promise((r) => setTimeout(r, 2000));
      setLoading(false);
    };

    simulateLoad();
  }, [sessionId]);

  return (
    <div className="bg-[#050814] text-white h-screen w-full flex items-center justify-center">
      {loading ? (
        <div>Loading LIVE session...</div>
      ) : (
        <div>
          LIVE TEST MODE<br />
          Session: {sessionId}<br />
          Role: {isHost ? "Host" : "Viewer"}
        </div>
      )}
    </div>
  );
}
