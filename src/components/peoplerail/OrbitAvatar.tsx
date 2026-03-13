export default function OrbitAvatar({ user }) {

  if (!user) return null

  return (
    <div
      style={{
        width: 50,
        height: 50,
        borderRadius: "50%",
        overflow: "hidden",
        border: user.live ? "3px solid red" : "3px solid grey",
        marginBottom: 12
      }}
    >
      <img
        src={user.avatar}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block"
        }}
      />
    </div>
  )
}
