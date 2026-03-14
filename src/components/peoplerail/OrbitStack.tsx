export default function OrbitStack({ users, activePost, onSelectCreator }) {

  if (!users || users.length === 0) return null

  return (
    <div className="orbit-stack">
      {users.map((user) => (
        <OrbitAvatar
          key={user.id}
          user={user}
          activePost={activePost}
          onSelectCreator={onSelectCreator}
        />
      ))}
    </div>
  )
}