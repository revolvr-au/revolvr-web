import PeopleRail from "../components/peoplerail/PeopleRail"
import { useUser } from "@supabase/auth-helpers-react"

export default function FeedScreen() {

  const user = useUser()

  if (!user) return null

  return (
    <div className="feed-layout">

      <PeopleRail userId={user.id} />

      <div className="feed-content">
        Snap Feed Coming Here
      </div>

    </div>
  )
}