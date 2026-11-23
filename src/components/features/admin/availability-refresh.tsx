"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

function AvailabilityRefresh() {
  const router = useRouter()

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return
      router.refresh()
    }
    const timer = window.setInterval(tick, 20000)
    document.addEventListener("visibilitychange", tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [router])

  return null
}

export { AvailabilityRefresh }
