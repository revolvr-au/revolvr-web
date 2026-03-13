export default function OrbitAvatar({ user }) {

  if (!user) return null

  const avatar = user.avatar || user.avatar_url || ""

  return (
    <div
      style={{
        width: 54,
        height: 54,
        borderRadius: "50%",
        overflow: "hidden",
        border: user?.live ? "2px solid #ff2d55" : "2px solid #666"
      }}
    >
      {avatar && (
        <img
          src={avatar}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
      )}
    </div>
  )
}