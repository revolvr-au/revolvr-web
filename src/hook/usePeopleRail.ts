"use client"

import { useEffect, useState } from "react"

export function usePeopleRail(userId: string) {

  const [orbitUsers, setOrbitUsers] = useState<any[]>([])

  useEffect(() => {

    // TEMP FAKE DATA
    setOrbitUsers([
      { id: "1", avatar: "/avatar1.png", live: false },
      { id: "2", avatar: "/avatar2.png", live: true },
      { id: "3", avatar: "/avatar3.png", live: false },
      { id: "4", avatar: "/avatar4.png", live: false },
    ])

  }, [userId])

  return orbitUsers
}