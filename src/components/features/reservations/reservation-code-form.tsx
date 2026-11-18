"use client"

import { useId, useState } from "react"
import { Ticket } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

function digitsFrom(value: string) {
  return value.toUpperCase().replace(/^PIU-?/, "").replace(/\D/g, "").slice(0, 4)
}

function ReservationCodeForm({
  pending = false,
  error = "",
  submitLabel = "Ver estado",
  onCode,
}: {
  pending?: boolean
  error?: string
  submitLabel?: string
  onCode: (code: string) => void
}) {
  const fieldId = useId()
  const [digits, setDigits] = useState("")
  const ready = digits.length === 4

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (!ready || pending) return
        onCode(`PIU-${digits}`)
      }}
    >
      <label htmlFor={fieldId} className="text-sm font-semibold text-olive">
        Código de reserva
      </label>
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-11 shrink-0 items-center rounded-lg bg-olive px-3 font-label text-base font-semibold tracking-wide text-cream">
          PIU-
        </span>
        <Input
          id={fieldId}
          name="code"
          inputMode="numeric"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          maxLength={12}
          placeholder="0000"
          aria-label="Cuatro números de tu código"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          value={digits}
          className="h-12 min-w-0 flex-1 bg-cream text-base tracking-[0.28em]"
          onChange={(event) => setDigits(digitsFrom(event.target.value))}
        />
      </div>
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="text-sm text-olive-strong">
          {error}
        </p>
      ) : (
        <p className="text-sm text-olive-muted">Los cuatro números que te dimos con tu reserva.</p>
      )}
      <Button type="submit" variant="accent" size="lg" className="h-12 w-full" disabled={!ready} loading={pending}>
        {submitLabel}
      </Button>
    </form>
  )
}

function ReservationLookupButton({ className }: { className?: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "shrink-0 text-olive hover:bg-olive-hover hover:text-olive focus-visible:outline-olive md:text-cream md:hover:bg-cream/15 md:hover:text-cream md:focus-visible:outline-cream",
            className,
          )}
        >
          <Ticket aria-hidden />
          Mi reserva
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="pb-safe rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Consulta tu reserva</SheetTitle>
          <SheetDescription>El código empieza con PIU-. Escribe solo los números.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <ReservationCodeForm
            submitLabel="Ver estado"
            onCode={(code) => {
              window.location.assign(`/reservas/estado#${code}`)
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { ReservationCodeForm, ReservationLookupButton }
