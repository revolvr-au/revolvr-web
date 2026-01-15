export { GET } from "../posts/route";

// optional: ensures it’s always dynamic and not cached weirdly
export const dynamic = "force-dynamic";
export const revalidate = 0;
