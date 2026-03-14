export default function OrbitAvatar({ user, activePost }) {

  if (!user) return null

  return (
    <div className="orbit-avatar">

      <div
  className="orbit-ring"
  style={{
    borderColor:
      user?.id === activePost
        ? "yellow"
        : user?.live
        ? "#ff2d55"
        : "grey"
  }}
/>

      <img
        src={user.avatar}
        className="orbit-core"
        alt=""
      />

    </div>
  )
}