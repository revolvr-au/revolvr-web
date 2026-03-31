import { GET as postsGET } from "../posts/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(req: Request) {
  return postsGET(req);
}