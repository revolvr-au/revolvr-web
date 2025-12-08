// src/app/lib/pages/api/live/create.ts
// TEMP: legacy stub – real endpoint is src/pages/api/live/create.ts

import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  ok: boolean;
  message: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  res.status(200).json({
    ok: true,
    message:
      "Legacy live/create endpoint (under src/app/lib/pages) – not used by the app.",
  });
}
