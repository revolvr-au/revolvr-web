"use client";

import { usePeopleRail } from "../../hook/usePeopleRail";
import OrbitStack from "./OrbitStack";

export default function PeopleRail({
  open,
  userId,
  activePost,
  users = [],
  onSelectCreator
}) {

  const orbitUsers = users.length ? users : usePeopleRail(userId);

  let orderedUsers = orbitUsers;

  if (activePost) {
    const activeUser = orbitUsers.find((u) => u.id === activePost);

    if (activeUser) {
      orderedUsers = [
        activeUser,
        ...orbitUsers.filter((u) => u.id !== activePost)
      ];
    }
  }

  console.log("PeopleRail users:", orbitUsers);

  return (
    <div
      style={{
        width: open ? 80 : 0,
        background: "#000",
        color: "white",
        display: open ? "flex" : "none",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "calc(80px + env(safe-area-inset-top))",
        overflow: "hidden",
        transition: "width 0.3s ease"
      }}
    >
      <div style={{ width: "100%", textAlign: "center" }}>
        {orderedUsers.map((u) => (
          <div key={u.id} style={{ marginBottom: 16 }}>
            <img
              src={u.avatar}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "2px solid white"
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}