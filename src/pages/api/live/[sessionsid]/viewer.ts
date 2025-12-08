// src/pages/api/live/[sessionsid]/viewer.ts
// TEMP: stub viewer endpoint so that production build can succeed.
// The real viewer token logic will be added later once Live is launched.

import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  ok: boolean;
  message: string;
  sessionId?: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { sessionsid } = req.query;

  res.status(200).json({
    ok: true,
    message:
      "Viewer endpoint is stubbed for now. Live viewing will be wired up later.",
    sessionId: typeof sessionsid === "string" ? sessionsid : undefined,
  });
}
