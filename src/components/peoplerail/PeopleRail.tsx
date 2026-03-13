"use client";

import { usePeopleRail } from "../../hook/usePeopleRail";
import OrbitStack from "./OrbitStack";

export default function PeopleRail({ userId }) {

  const orbitUsers = usePeopleRail(userId);

  console.log("PeopleRail users:", orbitUsers);

  return (
    <div
      style={{
        width: 80,
        background: "#000",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "calc(20px + env(safe-area-inset-top))"
      }}
    >
      {/* TEMP TEST BOX */}
      <div style={{ marginBottom: 20, fontSize: 12 }}>
        Rail Loaded
      </div>

      {orbitUsers.length === 0 ? (
        <div style={{ fontSize: 12 }}>No orbit users</div>
      ) : (
        <OrbitStack users={orbitUsers} />
      )}
    </div>
  );
}