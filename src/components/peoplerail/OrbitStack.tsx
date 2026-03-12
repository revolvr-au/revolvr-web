import OrbitAvatar from "./OrbitAvatar"

export default function OrbitStack({ users }) {

  return (
    <div className="orbit-stack">
      {users.map((user) => (
        <OrbitAvatar key={user.id} user={user} />
      ))}
    </div>
  )
}