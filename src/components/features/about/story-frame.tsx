"use client"

import * as React from "react"
import { cn } from "cn"

type StoryFrameProps = {
  side: "left" | "right"
  children: React.ReactNode
  className?: string
}

/**
 * La foto llega visible. Solo se desplaza al entrar en pantalla,
 * y no lo hace si la persona pide menos movimiento.
 */
function StoryFrame({ side, children, className }: StoryFrameProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [state, setState] = React.useState<"idle" | "hidden" | "shown">("idle")

  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setState("shown")
          observer.disconnect()
          return
        }
        setState("hidden")
      },
      { threshold: 0.2, rootMargin: "0px 0px -6% 0px" }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} data-story={state} data-side={side} className={cn(className)}>
      {children}
    </div>
  )
}

export { StoryFrame }
