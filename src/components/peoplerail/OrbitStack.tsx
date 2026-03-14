import OrbitAvatar from "./OrbitAvatar"

export default function OrbitStack({ users, activePost }) {

  if (!users || users.length === 0) return null

  return (
    <div className="orbit-stack">
      {users.map((user) => {

        if (!user) return null

        return (
          <OrbitAvatar
            key={user.id}
            user={user}
            activePost={activePost}
          />
        )

      })}
    </div>
  )

}