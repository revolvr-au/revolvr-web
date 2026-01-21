"use client";

import { useEffect, useState } from "react";
import LiveChatPanel from "@/components/live/LiveChatPanel";

export default function LiveChatFloatLane({
  roomId,
  liveHrefForRedirect,
  userEmail,
  className = "",
}: {
  roomId: string;
  liveHrefForRedirect: string;
  userEmail: string | null;
  className?: string;
}) {
  // One chat instance only; choose style responsively after mount.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Mobile: overlay styling, typically positioned by the parent (absolute).
  // Desktop: normal panel styling.
  const variant = isMobile ? "overlay" : "panel";

  return (
    <div className={className}>
      <LiveChatPanel
        roomId={roomId}
        liveHrefForRedirect={liveHrefForRedirect}
        userEmail={userEmail}
        variant={variant}
      />
    </div>
  );
}
