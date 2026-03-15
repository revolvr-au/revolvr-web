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

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        left: open ? 0 : -80,
        width: 80,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "calc(80px + env(safe-area-inset-top))",
        transition: "left 0.25s ease",
        zIndex: 100
      }}
    >
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
              border: activePost === u.id ? "3px solid cyan" : "2px solid white"
            }}
          />
        </div>
      ))}
    </div>
  );
}