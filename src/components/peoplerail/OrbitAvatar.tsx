export default function OrbitAvatar({ user }) {

  function getRingColor(state) {

    switch(state){
      case "live": return "red"
      case "active": return "yellow"
      case "online": return "green"
      default: return "grey"
    }

  }

  const ringColor = getRingColor(user.presence)

  return (
    <div className="orbit-avatar">

      <div
        className="orbit-ring"
        style={{ borderColor: ringColor }}
      />

      <img
        src={user.avatar_url}
        className="orbit-core"
      />

    </div>
  )
}