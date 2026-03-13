export default function OrbitAvatar({ user }) {

  if (!user) return null

  const presence = user.presence ?? (user.live ? "live" : "online")

  function getRingColor(state) {
    switch (state) {
      case "live": return "red"
      case "active": return "yellow"
      case "online": return "green"
      default: return "grey"
    }
  }

  const avatar = user.avatar_url ?? user.avatar ?? ""

  const ringColor = getRingColor(presence)

  return (
    <div className="orbit-avatar">

      <div
        className="orbit-ring"
        style={{ borderColor: ringColor }}
      />

      {avatar && (
        <img
          src={avatar}
          className="orbit-core"
          alt=""
        />
      )}

    </div>
  )
}