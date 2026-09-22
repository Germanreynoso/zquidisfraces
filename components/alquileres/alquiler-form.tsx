"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, ArrowLeft, CalendarRange } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { DateField, MoneyField, SelectField, TextareaField } from "@/components/form/fields"
import { PageHeader } from "@/components/page-header"
import { ClientePicker } from "@/components/pickers/cliente-picker"
import { DisfracesItemsField, snapshotDisfraz, totalItems } from "@/components/pickers/disfraces-items-field"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { useCrearAlquiler, useReservaParaAlquiler } from "@/hooks/use-alquileres"
import { useClienteBasico } from "@/hooks/use-clientes"
import { METODO_PAGO_OPTIONS } from "@/lib/constants"
import { addDaysISO, formatCurrency, formatDate, parseDate, todayISO } from "@/lib/format"
import { handleMutationError } from "@/lib/form-errors"
import { alquilerFormSchema, type AlquilerFormInput } from "@/lib/validations/alquileres"

const uuid = z.uuid()

function paramUuid(value: string | null): string | null {
  return value && uuid.safeParse(value).success ? value : null
}

/** Alta de alquiler. Acepta ?cliente=<id> para precargar el cliente y ?reserva=<id> para registrar su retiro. */
export function AlquilerForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reservaId = paramUuid(searchParams.get("reserva"))
  const clienteId = reservaId ? null : paramUuid(searchParams.get("cliente"))
  const hoy = todayISO()

  const crear = useCrearAlquiler()
  const clienteBasico = useClienteBasico(clienteId)
  const reserva = useReservaParaAlquiler(reservaId)
  const reservaAplicada = useRef(false)

  const form = useForm<AlquilerFormInput>({
    resolver: zodResolver(alquilerFormSchema),
    defaultValues: {
      cliente: null,
      fecha_alquiler: hoy,
      fecha_devolucion: addDaysISO(hoy, 3),
      items: [],
      sena: 0,
      metodo_pago: "efectivo",
      observaciones: "",
      reserva_id: null,
    },
  })

  const [fechaAlquiler, fechaDevolucion, items, sena, reservaSeleccionada] = useWatch({
    control: form.control,
    name: ["fecha_alquiler", "fecha_devolucion", "items", "sena", "reserva_id"],
  })

  // Precarga del cliente desde ?cliente=<id>.
  useEffect(() => {
    const c = clienteBasico.data
    if (c && c.activo && !form.getValues("cliente")) {
      form.setValue("cliente", { id: c.id, label: `${c.apellido}, ${c.nombre}`, dni: c.dni })
    }
  }, [clienteBasico.data, form])

  const reservaVigente = reserva.data && (reserva.data.estado === "pendiente" || reserva.data.estado === "confirmada")

  // Precarga completa desde ?reserva=<id> (una sola vez).
  useEffect(() => {
    const r = reserva.data
    if (!r || reservaAplicada.current || !reservaVigente) return
    reservaAplicada.current = true
    form.reset({
      cliente: r.cliente ? { id: r.cliente.id, label: `${r.cliente.apellido}, ${r.cliente.nombre}`, dni: r.cliente.dni } : null,
      fecha_alquiler: hoy,
      fecha_devolucion: r.fecha_fin >= hoy ? r.fecha_fin : hoy,
      items: r.items
        .filter((item) => item.disfraz?.activo)
        .map((item) => ({ disfraz_id: item.disfraz_id, cantidad: item.cantidad, disfraz: snapshotDisfraz(item.disfraz!) })),
      sena: 0,
      metodo_pago: "efectivo",
      observaciones: r.observaciones ?? "",
      reserva_id: r.id,
    })
  }, [reserva.data, reservaVigente, form, hoy])

  const total = totalItems(items)
  const saldo = Math.max(total - (sena ?? 0), 0)

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { id } = await crear.mutateAsync({
        cliente_id: values.cliente!.id,
        fecha_alquiler: values.fecha_alquiler,
        fecha_devolucion: values.fecha_devolucion,
        items: values.items.map(({ disfraz_id, cantidad }) => ({ disfraz_id, cantidad })),
        sena: values.sena,
        metodo_pago: values.metodo_pago,
        observaciones: values.observaciones,
        reserva_id: values.reserva_id,
      })
      router.push(`/dashboard/alquileres/${id}`)
    } catch (error) {
      handleMutationError(error, form.setError)
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <PageHeader
        title={reservaSeleccionada ? "Retiro de reserva" : "Nuevo alquiler"}
        description="Elegí el cliente, las fechas y los disfraces. El stock se valida contra alquileres y reservas."
        actions={
          <Button variant="ghost" asChild>
            <Link href="/dashboard/alquileres">
              <ArrowLeft />
              Volver
            </Link>
          </Button>
        }
      />

      {reservaId && reserva.isLoading && (
        <Alert>
          <Spinner />
          <AlertDescription>Cargando la reserva…</AlertDescription>
        </Alert>
      )}
      {reservaId && reserva.error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>No se pudo cargar la reserva</AlertTitle>
          <AlertDescription>Podés registrar el alquiler igualmente cargando los datos a mano.</AlertDescription>
        </Alert>
      )}
      {reserva.data && !reservaVigente && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>La reserva no está vigente</AlertTitle>
          <AlertDescription>
            Esta reserva ya fue cancelada o retirada.{" "}
            <Link href={`/dashboard/reservas/${reserva.data.id}`} className="underline underline-offset-2">
              Ver reserva
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {reservaSeleccionada && reserva.data && (
        <Alert>
          <CalendarRange />
          <AlertTitle>Retiro de la reserva del {formatDate(reserva.data.fecha_inicio)} al {formatDate(reserva.data.fecha_fin)}</AlertTitle>
          <AlertDescription>
            Al registrar el alquiler, la reserva queda marcada como retirada y su stock deja de contarse dos veces.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cliente y fechas</CardTitle>
              <CardDescription>El alquiler empieza hoy o en una fecha pasada; para fechas futuras usá una reserva.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Controller
                  control={form.control}
                  name="cliente"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="cliente">
                        Cliente<span aria-hidden className="text-destructive">*</span>
                      </FieldLabel>
                      <ClientePicker
                        id="cliente"
                        value={field.value}
                        onChange={field.onChange}
                        invalid={fieldState.invalid}
                        disabled={Boolean(reservaSeleccionada)}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <DateField
                    control={form.control}
                    name="fecha_alquiler"
                    label="Fecha de alquiler"
                    required
                    disabledDays={{ after: parseDate(hoy) }}
                  />
                  <DateField
                    control={form.control}
                    name="fecha_devolucion"
                    label="Fecha de devolución"
                    required
                    disabledDays={fechaAlquiler ? { before: parseDate(fechaAlquiler) } : undefined}
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
                  modo="alquiler"
                  inicio={fechaAlquiler}
                  fin={fechaDevolucion}
                  excluirReservaId={reservaSeleccionada}
                  invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Card>
            <CardHeader>
              <CardTitle>Pago y observaciones</CardTitle>
              <CardDescription>La seña queda registrada como primer pago del alquiler.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <MoneyField control={form.control} name="sena" label="Seña" description="0 si no deja seña." />
                  <SelectField control={form.control} name="metodo_pago" label="Método de pago" options={METODO_PAGO_OPTIONS} />
                </div>
                <TextareaField
                  control={form.control}
                  name="observaciones"
                  label="Observaciones"
                  placeholder="Evento, ajustes pedidos, datos de contacto alternativos…"
                />
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
              <CardDescription>
                {fechaAlquiler && fechaDevolucion
                  ? `${formatDate(fechaAlquiler)} → ${formatDate(fechaDevolucion)}`
                  : "Elegí las fechas"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disfraces</span>
                <span className="tabular">{items.reduce((sum, item) => sum + item.cantidad, 0)} u.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium tabular">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seña</span>
                <span className="tabular">− {formatCurrency(sena ?? 0)}</span>
              </div>
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="font-medium">Saldo a cobrar</span>
                <span className="font-heading text-2xl font-semibold tabular">{formatCurrency(saldo)}</span>
              </div>
              <Button type="submit" className="mt-2 w-full" size="lg" disabled={crear.isPending}>
                {crear.isPending && <Spinner />}
                Registrar alquiler
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  )
}
