import PeopleRail from "../components/peopleRail/PeopleRail"

export default function FeedScreen({ user }) {

  return (
    <div className="feed-layout">

      <PeopleRail userId={user.id} />

      <div className="feed-content">
        {/* moment feed */}
      </div>

    </div>
  )
}