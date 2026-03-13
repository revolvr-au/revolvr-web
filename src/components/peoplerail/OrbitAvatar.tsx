export default function OrbitAvatar({ user }) {

  if (!user) return null

  function getRingColor(state) {
    switch(state){
      case "live": return "red"
      case "active": return "yellow"
      case "online": return "green"
      default: return "grey"
    }
  }

  const presence = user.presence || (user.live ? "live" : "online")
  const ringColor = getRingColor(presence)

  const avatar = user.avatar_url || user.avatar

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
        />
      )}

    </div>
  )
}