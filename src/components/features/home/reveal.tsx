"use client"

import * as React from "react"
import { cn } from "cn"

type RevealProps = {
  children: React.ReactNode
  className?: string
}

/**
 * Aparece al entrar al viewport. El HTML llega visible: la opacidad
 * solo baja después de medir, y nunca si el usuario pide menos movimiento.
 */
function Reveal({ children, className }: RevealProps) {
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
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} data-reveal={state} className={cn(className)}>
      {children}
    </div>
  )
}

export { Reveal }
