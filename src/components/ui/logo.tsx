import Image from "next/image"
import { cn } from "cn"

type LogoProps = {
  className?: string
  size?: number
  priority?: boolean
  alt?: string
}

function Logo({ className, size = 40, priority = false, alt = "PIÙ — Pizza e Dolce" }: LogoProps) {
  return (
    <Image
      src="/logos/logopiu.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={cn("overflow-hidden rounded-xl object-cover", className)}
    />
  )
}

export { Logo }
