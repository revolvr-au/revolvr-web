import { usePeopleRail } from "../../hooks/usePeopleRail"
import OrbitStack from "./OrbitStack"

export default function PeopleRail({ userId }) {

  const orbitUsers = usePeopleRail(userId)

  return (
    <div className="people-rail">
      <OrbitStack users={orbitUsers} />
    </div>
  )
}