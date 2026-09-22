"use client"

import { useEffect, useState } from "react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { useCancelarAlquiler } from "@/hooks/use-alquileres"
import { handleMutationError } from "@/lib/form-errors"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  alquilerId: string
  cliente: string
  onCancelled?: () => void
}

/** Cancelación de un alquiler activo (solo admin): las unidades vuelven a disponible. */
export function CancelarAlquilerDialog({ open, onOpenChange, alquilerId, cliente, onCancelled }: Props) {
  const cancelar = useCancelarAlquiler()
  const [motivo, setMotivo] = useState("")

  useEffect(() => {
    if (open) setMotivo("")
  }, [open])

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="¿Cancelar este alquiler?"
      description={`El alquiler de ${cliente} queda cancelado y los disfraces vuelven a estar disponibles. Los pagos registrados se conservan.`}
      confirmLabel="Cancelar alquiler"
      destructive
      onConfirm={async () => {
        try {
          await cancelar.mutateAsync({ alquiler_id: alquilerId, motivo: motivo.trim() })
          onCancelled?.()
        } catch (error) {
          handleMutationError(error)
          return false
        }
      }}
    >
      <Field>
        <FieldLabel htmlFor="motivo-cancelacion">Motivo (opcional)</FieldLabel>
        <Textarea
          id="motivo-cancelacion"
          rows={2}
          maxLength={300}
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          placeholder="Ej.: el cliente desistió"
        />
        <FieldDescription>Queda registrado en las observaciones del alquiler.</FieldDescription>
      </Field>
    </ConfirmDialog>
  )
}
