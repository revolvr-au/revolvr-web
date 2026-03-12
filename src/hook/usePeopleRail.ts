import { useEffect, useState } from "react"
import { fetchOrbitRail } from "../services/orbitService"
import { fetchPresenceStates } from "../services/presenceService"
import { supabase } from "../services/supabaseClient"

export function usePeopleRail(userId: string) {
  const [orbitUsers, setOrbitUsers] = useState([])

  async function loadRail() {
    const orbit = await fetchOrbitRail(userId)

    const ids = orbit.map((o) => o.target_user_id)

    const { data: identities } = await supabase
      .from("identities")
      .select("*")
      .in("id", ids)

    const presence = await fetchPresenceStates(ids)

    const merged = identities.map((u) => ({
      ...u,
      presence: presence.find((p) => p.user_id === u.id)?.state
    }))

    setOrbitUsers(merged)
  }

  useEffect(() => {
    loadRail()
  }, [])

  return orbitUsers
}