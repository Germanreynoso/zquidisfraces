"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, CalendarRange } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { DateField, SelectField, TextareaField } from "@/components/form/fields"
import { ClientePicker, type ClienteSeleccionado } from "@/components/pickers/cliente-picker"
import { DisfracesItemsField, type ItemSeleccionado } from "@/components/pickers/disfraces-items-field"
import { duracionDias, periodoRelativo } from "@/components/reservas/reserva-periodo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useClienteBasico } from "@/hooks/use-clientes"
import { useCrearReserva } from "@/hooks/use-reservas"
import { ActionError } from "@/lib/action-result"
import { ESTADO_RESERVA_LABEL } from "@/lib/constants"
import { GENERIC_ERROR } from "@/lib/errors"
import { addDaysISO, parseDate, todayISO } from "@/lib/format"
import { ESTADOS_RESERVA_INICIAL, fechaISO } from "@/lib/validations/reservas"

const formSchema = z
  .object({
    cliente: z.custom<ClienteSeleccionado | null>().refine((value) => Boolean(value), { message: "Elegí un cliente" }),
    fecha_inicio: fechaISO,
    fecha_fin: fechaISO,
    estado: z.enum(ESTADOS_RESERVA_INICIAL),
    observaciones: z.string().trim().max(1000, { message: "Máximo 1000 caracteres" }),
    items: z.array(z.custom<ItemSeleccionado>()).min(1, { message: "Agregá al menos un disfraz" }),
  })
  .refine((data) => data.fecha_inicio >= todayISO(), {
    path: ["fecha_inicio"],
    message: "La reserva debe comenzar hoy o en una fecha futura",
  })
  .refine((data) => data.fecha_fin >= data.fecha_inicio, {
    path: ["fecha_fin"],
    message: "Debe ser igual o posterior a la fecha de inicio",
  })

type FormValues = z.infer<typeof formSchema>

const ESTADO_OPTIONS = ESTADOS_RESERVA_INICIAL.map((value) => ({ value, label: ESTADO_RESERVA_LABEL[value] }))

/** Campos del servidor → campos del formulario (para mostrar errores en su lugar). */
const SERVER_FIELD: Record<string, keyof FormValues> = {
  cliente_id: "cliente",
  fecha_inicio: "fecha_inicio",
  fecha_fin: "fecha_fin",
  estado: "estado",
  observaciones: "observaciones",
  items: "items",
}

function defaultValues(): FormValues {
  const hoy = todayISO()
  return {
    cliente: null,
    fecha_inicio: addDaysISO(hoy, 1),
    fecha_fin: addDaysISO(hoy, 3),
    estado: "pendiente",
    observaciones: "",
    items: [],
  }
}

export function ReservaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clienteId = searchParams.get("cliente")
  const crear = useCrearReserva()
  const [serverError, setServerError] = useState<string | null>(null)
  const { data: clientePrecargado } = useClienteBasico(clienteId)

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaultValues() })
  const [fechaInicio, fechaFin, items] = useWatch({ control: form.control, name: ["fecha_inicio", "fecha_fin", "items"] })

  // Precarga desde ?cliente=<id> (por ejemplo, desde la ficha del cliente).
  useEffect(() => {
    if (clientePrecargado?.activo && !form.getValues("cliente")) {
      form.setValue("cliente", {
        id: clientePrecargado.id,
        label: `${clientePrecargado.apellido}, ${clientePrecargado.nombre}`,
        dni: clientePrecargado.dni,
      })
    }
  }, [clientePrecargado, form])

  // Si el inicio pasa a ser posterior al fin, el fin acompaña.
  useEffect(() => {
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      form.setValue("fecha_fin", fechaInicio, { shouldValidate: true })
    }
  }, [fechaInicio, fechaFin, form])

  const hoy = todayISO()
  const rangoValido = Boolean(fechaInicio && fechaFin && fechaFin >= fechaInicio)
  const unidades = items.reduce((sum, item) => sum + item.cantidad, 0)

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null)
    try {
      const { id } = await crear.mutateAsync({
        cliente_id: values.cliente!.id,
        fecha_inicio: values.fecha_inicio,
        fecha_fin: values.fecha_fin,
        estado: values.estado,
        observaciones: values.observaciones,
        items: values.items.map((item) => ({ disfraz_id: item.disfraz_id, cantidad: item.cantidad })),
      })
      router.push(`/dashboard/reservas/${id}`)
    } catch (error) {
      if (error instanceof ActionError) {
        setServerError(error.message)
        for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
          const target = SERVER_FIELD[field]
          if (target && messages?.[0]) form.setError(target, { type: "server", message: messages[0] })
        }
      } else {
        setServerError(GENERIC_ERROR)
      }
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-6">
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>No se pudo registrar la reserva</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Cliente y fechas</CardTitle>
            <CardDescription>El stock se reserva desde el día de retiro hasta el de devolución, inclusive.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                control={form.control}
                name="cliente"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="cliente">
                      Cliente
                      <span aria-hidden className="text-destructive">
                        *
                      </span>
                    </FieldLabel>
                    <ClientePicker id="cliente" value={field.value} onChange={field.onChange} invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <DateField
                  control={form.control}
                  name="fecha_inicio"
                  label="Retira el"
                  required
                  disabledDays={{ before: parseDate(hoy) }}
                />
                <DateField
                  control={form.control}
                  name="fecha_fin"
                  label="Devuelve el"
                  required
                  disabledDays={{ before: parseDate(fechaInicio && fechaInicio >= hoy ? fechaInicio : hoy) }}
                />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Controller
          control={form.control}
          name="items"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <DisfracesItemsField
                value={field.value}
                onChange={field.onChange}
                modo="reserva"
                inicio={rangoValido ? fechaInicio : undefined}
                fin={rangoValido ? fechaFin : undefined}
                invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Card>
          <CardContent>
            <TextareaField
              control={form.control}
              name="observaciones"
              label="Observaciones"
              rows={3}
              placeholder="Evento, ajustes a realizar, forma de contacto…"
            />
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="size-4 text-primary" />
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SelectField control={form.control} name="estado" label="Estado inicial" options={ESTADO_OPTIONS} />
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Duración</dt>
              <dd className="text-right tabular">
                {rangoValido ? `${duracionDias(fechaInicio, fechaFin)} día(s)` : "—"}
              </dd>
              <dt className="text-muted-foreground">Cuándo</dt>
              <dd className="text-right">{rangoValido && fechaInicio >= hoy ? periodoRelativo(fechaInicio, fechaFin, hoy) : "—"}</dd>
              <dt className="text-muted-foreground">Disfraces</dt>
              <dd className="text-right tabular">
                {items.length} modelo(s) · {unidades} u.
              </dd>
            </dl>
            <p className="text-xs text-muted-foreground">
              Si otro alquiler o reserva ocupa el stock en esas fechas, el sistema no permite guardarla.
            </p>
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={crear.isPending}>
                {crear.isPending && <Spinner />}
                Crear reserva
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/reservas">Cancelar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
