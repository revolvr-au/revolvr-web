"use client";

import { usePeopleRail } from "../../hook/usePeopleRail";
import OrbitStack from "./OrbitStack";

export default function PeopleRail({ userId, activePost, users = [], onSelectCreator }) {

  const orbitUsers = users.length ? users : usePeopleRail(userId);

  let orderedUsers = orbitUsers;

  if (activePost) {
    const activeUser = orbitUsers.find(u => u.id === activePost);

    if (activeUser) {
      orderedUsers = [
        activeUser,
        ...orbitUsers.filter(u => u.id !== activePost)
      ];
    }
  }

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
        paddingTop: "calc(80px + env(safe-area-inset-top))"
      }}
    >
    

      {orbitUsers.length === 0 ? (
        <div style={{ fontSize: 12 }}>No orbit users</div>
      ) : (
        <OrbitStack
  users={orderedUsers}
  activePost={activePost}
  onSelectCreator={onSelectCreator}
/>
      )}
    </div>
  );
}