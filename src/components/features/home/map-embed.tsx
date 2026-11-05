import { cn } from "cn"

type MapEmbedProps = {
  src: string
  title: string
  className?: string
}

function MapEmbed({ src, title, className }: MapEmbedProps) {
  return (
    <div
      className={cn(
        "relative h-[17.5rem] overflow-hidden rounded-xl bg-olive-wash sm:h-[22rem] lg:h-[28rem]",
        className
      )}
    >
      <iframe
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="pointer-events-none absolute inset-0 size-full border-0"
      />
    </div>
  )
}

export { MapEmbed }
