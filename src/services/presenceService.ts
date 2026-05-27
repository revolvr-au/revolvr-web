import { supabase } from "./supabaseClient"

export async function fetchPresenceStates(userIds: string[]) {
  const { data, error } = await supabase
    .from("presence_states")
    .select("*")
    .in("user_id", userIds)

  if (error) throw error
  return data
}