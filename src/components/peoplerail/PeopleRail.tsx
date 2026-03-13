"use client";

import { usePeopleRail } from "../../hook/usePeopleRail"
import OrbitStack from "./OrbitStack"

export default function PeopleRail({ userId }) {

  const orbitUsers = usePeopleRail(userId)

  return (
    <div
      style={{
        width: 80,
        background: "#000",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 20
      }}
    >

      {orbitUsers.length === 0 ? (
        <div style={{ fontSize: 12 }}>No orbit users</div>
      ) : (
        <OrbitStack users={orbitUsers} />
      )}

    </div>
  )
}