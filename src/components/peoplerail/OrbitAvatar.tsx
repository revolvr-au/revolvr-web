export default function OrbitAvatar({ user }) {

  if (!user) return null

  return (
    <div className="orbit-avatar">

      <div
        className="orbit-ring"
        style={{ borderColor: user.live ? "red" : "grey" }}
      />

      <img
        src={user.avatar}
        className="orbit-core"
        alt=""
      />

    </div>
  )
}