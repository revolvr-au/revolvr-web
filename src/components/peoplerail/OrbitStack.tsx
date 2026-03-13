import OrbitAvatar from "./OrbitAvatar"

export default function OrbitStack({ users }) {

  if (!users || users.length === 0) return null

  return (
    <div className="orbit-stack">
      {users.map((user, i) => {
        if (!user) return null
        return <OrbitAvatar key={user.id || i} user={user} />
      })}
    </div>
  )
}