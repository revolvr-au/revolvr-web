"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClients";

type ChatMessage = {
  id: string;
  user: string;
  text: string;
};

export default function LiveChatOverlay({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel(`live-chat-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "liveChat",
          filter: `roomId=eq.${roomId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;

          setMessages((prev) => {
            const next = [...prev, msg].slice(-4);
            return next;
          });

          setTimeout(() => {
            setMessages((prev) => prev.filter((m) => m.id !== msg.id));
          }, 4000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return (
    <div className="absolute left-4 top-1/3 space-y-3 pointer-events-none max-w-[70%] z-40">
     {messages.map((msg) => (
  <div
    key={msg.id}
    className="animate-fadeUp bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl text-[13px] leading-tight tracking-tight shadow-lg"
  >
    <span className="font-semibold text-white/70 mr-1">
      {msg.user}
    </span>
    <span className="text-white/90">
      {msg.text}
    </span>
  </div>
))}
    </div>
  );
}