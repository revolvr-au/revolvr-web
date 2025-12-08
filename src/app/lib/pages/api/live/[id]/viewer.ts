// src/app/lib/pages/api/live/[id]/viewer.ts
// TEMP: stub viewer endpoint so Live + Go Live can ship.
// We'll wire proper viewer tokens later.

import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  ok: boolean;
  message?: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  res.status(200).json({
    ok: true,
    message: "Viewer endpoint stubbed for now – not implemented yet.",
  });
}
