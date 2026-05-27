"use client"

import { useEffect, useState } from "react"

export function usePeopleRail(userId: string) {

  const [orbitUsers, setOrbitUsers] = useState<any[]>([])

  useEffect(() => {

    const users = [
      { id: "1", avatar: "https://i.pravatar.cc/100?img=1", live: false },
      { id: "2", avatar: "https://i.pravatar.cc/100?img=2", live: true },
      { id: "3", avatar: "https://i.pravatar.cc/100?img=3", live: false },
      { id: "4", avatar: "https://i.pravatar.cc/100?img=4", live: false },
    ]

    console.log("PeopleRail users:", users)

    setOrbitUsers(users)

  }, [userId])

  return orbitUsers
}