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

  console.log("Rail users:", orderedUsers);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: open ? 0 : -80,
        width: 80,
        height: "100vh",
        background: "#000",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 120,
        transition: "left 0.25s ease"
      }}
    >
      {orderedUsers.map((u) => (
        <div
          key={u.id}
          onClick={() => onSelectCreator?.(u.id)}
          style={{
            marginBottom: 20,
            cursor: "pointer"
          }}
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