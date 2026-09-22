"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { DateField, MoneyField, SelectField, TextareaField } from "@/components/form/fields"
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
import { useRegistrarPago } from "@/hooks/use-alquileres"
import { METODO_PAGO_OPTIONS, TIPO_PAGO_LABEL } from "@/lib/constants"
import { formatCurrency, parseDate, todayISO } from "@/lib/format"
import { handleMutationError } from "@/lib/form-errors"
import { pagoSchema, TIPOS_PAGO_MANUAL, type PagoInput } from "@/lib/validations/alquileres"

const TIPO_OPTIONS = TIPOS_PAGO_MANUAL.map((tipo) => ({ value: tipo, label: TIPO_PAGO_LABEL[tipo] }))

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  alquilerId: string
  saldo: number
  fechaAlquiler: string
  /** Sugerir "cargo extra" cuando el saldo proviene de daños o faltantes. */
  tieneCargos: boolean
}

export function RegistrarPagoDialog({ open, onOpenChange, alquilerId, saldo, fechaAlquiler, tieneCargos }: Props) {
  const registrar = useRegistrarPago()

  const defaults = (): PagoInput => ({
    alquiler_id: alquilerId,
    monto: saldo,
    metodo: "efectivo",
    tipo: tieneCargos ? "cargo_extra" : "saldo",
    fecha: todayISO(),
    observaciones: "",
  })

  const form = useForm<PagoInput>({ resolver: zodResolver(pagoSchema), defaultValues: defaults() })

  useEffect(() => {
    if (open) form.reset(defaults())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onSubmit = form.handleSubmit(async (values) => {
    if (values.monto > saldo) {
      form.setError("monto", { message: `No puede superar el saldo (${formatCurrency(saldo)})` })
      return
    }
    try {
      await registrar.mutateAsync(values)
      onOpenChange(false)
    } catch (error) {
      handleMutationError(error, form.setError)
    }
  })

  return (
    <Dialog open={open} onOpenChange={(value) => !registrar.isPending && onOpenChange(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>Saldo pendiente: {formatCurrency(saldo)}</DialogDescription>
        </DialogHeader>
        <form id="pago-form" onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyField control={form.control} name="monto" label="Monto" required />
              <SelectField control={form.control} name="metodo" label="Método" options={METODO_PAGO_OPTIONS} />
              <SelectField control={form.control} name="tipo" label="Concepto" options={TIPO_OPTIONS} />
              <DateField
                control={form.control}
                name="fecha"
                label="Fecha"
                required
                disabledDays={[{ after: parseDate(todayISO()) }, { before: parseDate(fechaAlquiler) }]}
              />
            </div>
            <TextareaField control={form.control} name="observaciones" label="Observaciones" rows={2} />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={registrar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="pago-form" disabled={registrar.isPending}>
            {registrar.isPending && <Spinner />}
            Registrar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
