import { usePeopleRail } from "../../hook/usePeopleRail"
import OrbitStack from "./OrbitStack"

export default function PeopleRail({ userId }) {

  const orbitUsers = usePeopleRail(userId)

  console.log("Orbit Users:", orbitUsers)

  return (
    <div className="people-rail">

      {orbitUsers.length === 0 ? (
        <div>No orbit users yet</div>
      ) : (
        <OrbitStack users={orbitUsers} />
      )}

    </div>
  )
}