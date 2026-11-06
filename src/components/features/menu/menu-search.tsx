"use client"

import { SearchIcon, XIcon } from "lucide-react"

import { Input } from "@/components/ui/input"

type MenuSearchProps = {
  value: string
  onChange: (value: string) => void
}

function MenuSearch({ value, onChange }: MenuSearchProps) {
  return (
    <div className="relative max-w-md" role="search">
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-olive-muted"
        aria-hidden
      />
      <Input
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar en nuestra carta..."
        aria-label="Buscar en nuestra carta"
        className="pr-11 pl-10"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute top-0 right-0 inline-flex size-11 items-center justify-center rounded-lg text-olive outline-none hover:bg-olive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
        >
          <XIcon className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

export { MenuSearch }
