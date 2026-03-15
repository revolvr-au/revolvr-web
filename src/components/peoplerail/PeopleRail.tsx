"use client";

import { usePeopleRail } from "../../hook/usePeopleRail";

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

  console.log("PeopleRail users:", orderedUsers);

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: 80,
        background: "#000",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "calc(80px + env(safe-area-inset-top))",
        transform: open ? "translateX(0)" : "translateX(-80px)",
        transition: "transform 0.3s ease",
        zIndex: 50
      }}
    >
      <div style={{ width: "100%", textAlign: "center" }}>
        {orderedUsers.map((u) => (
          <div
            key={u.id}
            style={{ marginBottom: 16, cursor: "pointer" }}
            onClick={() => onSelectCreator?.(u.id)}
          >
            <img
              src={u.avatar}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: activePost === u.id ? "3px solid #00ffff" : "2px solid white"
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}