"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ConfirmDeleteDialogProps = {
  open: boolean
  title: string
  description: string
  pending: boolean
  error: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

function ConfirmDeleteDialog({ open, title, description, pending, error, onOpenChange, onConfirm }: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-base text-foreground">{description}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-base">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" loading={pending} onClick={onConfirm}>
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { ConfirmDeleteDialog }
