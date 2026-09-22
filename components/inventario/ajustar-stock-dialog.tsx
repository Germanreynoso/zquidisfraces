"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"

import { NumberField, SelectField, TextareaField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useAjustarStock } from "@/hooks/use-disfraces"
import { handleMutationError } from "@/lib/form-errors"
import { ajusteStockSchema, type AjusteStockInput } from "@/lib/validations/disfraces"
import type { DisfrazVista } from "@/types/domain"

const TIPO_OPTIONS = [
  { value: "alta", label: "Alta de unidades (compra / ingreso)" },
  { value: "baja", label: "Baja definitiva de unidades" },
  { value: "a_mantenimiento", label: "Enviar a mantenimiento" },
  { value: "reparado", label: "Volver de mantenimiento (reparado)" },
  { value: "extraviado", label: "Marcar como extraviado" },
  { value: "recuperado", label: "Recuperar extraviado" },
] as const

const ORIGEN_OPTIONS = [
  { value: "disponible", label: "Unidades disponibles" },
  { value: "mantenimiento", label: "Unidades en mantenimiento" },
  { value: "extraviada", label: "Unidades extraviadas" },
] as const

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  disfraz: DisfrazVista
}

/** Movimientos manuales de stock (quedan auditados en movimientos_stock). */
export function AjustarStockDialog({ open, onOpenChange, disfraz }: Props) {
  const ajustar = useAjustarStock()

  const form = useForm<AjusteStockInput>({
    resolver: zodResolver(ajusteStockSchema),
    defaultValues: { disfraz_id: disfraz.id, tipo: "alta", cantidad: 1, origen: "disponible", motivo: "" },
  })
  const tipo = useWatch({ control: form.control, name: "tipo" })

  useEffect(() => {
    if (open) form.reset({ disfraz_id: disfraz.id, tipo: "alta", cantidad: 1, origen: "disponible", motivo: "" })
  }, [open, disfraz.id, form])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await ajustar.mutateAsync(values)
      onOpenChange(false)
    } catch (error) {
      handleMutationError(error, form.setError)
    }
  })

  return (
    <Dialog open={open} onOpenChange={(value) => !ajustar.isPending && onOpenChange(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar stock</DialogTitle>
          <DialogDescription>
            {disfraz.nombre} · {disfraz.talle} — {disfraz.cantidad_disponible} disponibles, {disfraz.cantidad_mantenimiento}{" "}
            en mantenimiento, {disfraz.cantidad_extraviada} extraviadas.
          </DialogDescription>
        </DialogHeader>
        <form id="ajuste-form" onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <SelectField control={form.control} name="tipo" label="Movimiento" required options={TIPO_OPTIONS} />
            {tipo === "baja" && (
              <SelectField control={form.control} name="origen" label="Dar de baja desde" options={ORIGEN_OPTIONS} />
            )}
            <NumberField control={form.control} name="cantidad" label="Cantidad" required min={1} />
            <TextareaField
              control={form.control}
              name="motivo"
              label="Motivo"
              required
              rows={2}
              placeholder="Ej.: compra a proveedor, cierre roto, se encontró en depósito…"
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={ajustar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="ajuste-form" disabled={ajustar.isPending}>
            {ajustar.isPending && <Spinner />}
            Registrar movimiento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
