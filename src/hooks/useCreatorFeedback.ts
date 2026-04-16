import { useEffect, useState } from "react";

export function useCreatorFeedback({
  voltage,
  recentVoltage,
  lastPostTime,
}: {
  voltage: number;
  recentVoltage: number;
  lastPostTime: number;
}) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const now = Date.now();

    if (recentVoltage > voltage * 0.2) {
      setMessage("This post is gaining traction");
      return;
    }

    if (voltage > 80) {
      setMessage("This is performing well");
      return;
    }

    if (now - lastPostTime > 1000 * 60 * 60 * 6) {
      setMessage("Try posting again");
      return;
    }

    setMessage(null);
  }, [voltage, recentVoltage, lastPostTime]);

  return message;
}
