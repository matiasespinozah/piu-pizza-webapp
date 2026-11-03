"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => toast("Pizza agregada al pedido")}>
        Toast simple
      </Button>
      <Button variant="secondary" onClick={() => toast.success("Pedido confirmado")}>
        Toast de éxito
      </Button>
      <Button variant="secondary" onClick={() => toast.error("No pudimos procesar el pedido")}>
        Toast de error
      </Button>
    </div>
  )
}
