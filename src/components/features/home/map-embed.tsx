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
        "relative h-[16rem] overflow-hidden rounded-2xl bg-olive-wash sm:h-[20rem] lg:h-[24rem]",
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
