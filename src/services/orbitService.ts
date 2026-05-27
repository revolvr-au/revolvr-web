import { supabase } from "./supabaseClient"

export async function fetchOrbitRail(userId: string) {
  const { data, error } = await supabase
    .from("orbit_edges")
    .select("target_user_id, gravity_score")
    .eq("source_user_id", userId)
    .order("gravity_score", { ascending: false })
    .limit(7)

  if (error) throw error
  return data
}