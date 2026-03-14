"use client"

import { useState } from "react"
import PeopleRail from "../components/peoplerail/PeopleRail"
import { useUser } from "@supabase/auth-helpers-react"

export default function FeedScreen() {

  const user = useUser()

  const [peopleOpen, setPeopleOpen] = useState(false)

  const activePost = null
  const railUsers: any[] = []

  const onSelectCreator = (id: string) => {
    console.log("Creator selected:", id)
  }

  if (!user) return null

  return (
    <div
      className="feed-layout"
      style={{
        display: "grid",
        gridTemplateColumns: peopleOpen ? "80px 1fr" : "0px 1fr",
        transition: "grid-template-columns 0.3s ease"
      }}
    >

      <PeopleRail
        open={peopleOpen}
        userId={user.id}
        activePost={activePost}
        users={railUsers}
        onSelectCreator={onSelectCreator}
      />

      <div className="feed-content">
        Snap Feed Coming Here
      </div>

    </div>
  )
}