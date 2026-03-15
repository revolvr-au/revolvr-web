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

  console.log("RAIL USERS:", orderedUsers);

  return (
    <div
  style={{
    position: "fixed",
    top: 0,
    left: 0,
    transform: open ? "translateX(0)" : "translateX(-80px)",
    transition: "transform 0.25s ease",
    width: 80,
    height: "100vh",
    background: "#000",
    zIndex: 200,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 60
  }}
>

      {/* debug count */}
      <div style={{ color: "white", fontSize: 12, marginBottom: 10 }}>
        {orderedUsers.length}
      </div>

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
            alt=""
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: activePost === u.id
                ? "3px solid cyan"
                : "2px solid white"
            }}
          />
        </div>
      ))}

    </div>
  );
}