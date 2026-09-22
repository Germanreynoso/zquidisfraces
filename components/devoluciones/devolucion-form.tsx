"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, ArrowLeft, Minus, Plus, Shirt } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"

import { Vencimiento } from "@/components/alquileres/vencimiento"
import { DateField, MoneyField, SelectField, TextareaField } from "@/components/form/fields"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldError, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useAlquiler } from "@/hooks/use-alquileres"
import { useRegistrarDevolucion } from "@/hooks/use-devoluciones"
import { ESTADO_DEVOLUCION_LABEL, ESTADO_DEVOLUCION_TONE, METODO_PAGO_OPTIONS } from "@/lib/constants"
import { formatCurrency, formatDate, parseDate, todayISO } from "@/lib/format"
import { handleMutationError } from "@/lib/form-errors"
import type { AlquilerDetalle } from "@/lib/queries/alquileres"
import { cn } from "@/lib/utils"
import { devolucionSchema, type DevolucionInput } from "@/lib/validations/devoluciones"
import type { EstadoDevolucion } from "@/types/domain"

/** Registro de devolución de un alquiler activo. */
export function DevolucionForm({ id }: { id: string }) {
  const { data, isLoading, error } = useAlquiler(id)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-96" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>No se encontró el alquiler</AlertTitle>
        <AlertDescription>
          <Link href="/dashboard/alquileres">Volver a alquileres</Link>
        </AlertDescription>
      </Alert>
    )
  }

  if (data.alquiler.estado !== "activo") {
    return (
      <Alert>
        <AlertCircle />
        <AlertTitle>Este alquiler no está activo</AlertTitle>
        <AlertDescription>
          {data.alquiler.estado === "devuelto" ? "La devolución ya fue registrada." : "El alquiler fue cancelado."}{" "}
          <Link href={`/dashboard/alquileres/${id}`} className="underline underline-offset-2">
            Ver alquiler
          </Link>
        </AlertDescription>
      </Alert>
    )
  }

  return <DevolucionFormInner detalle={data} />
}

function DevolucionFormInner({ detalle }: { detalle: AlquilerDetalle }) {
  const router = useRouter()
  const { alquiler, items } = detalle
  const hoy = todayISO()
  const registrar = useRegistrarDevolucion()

  const form = useForm<DevolucionInput>({
    resolver: zodResolver(devolucionSchema),
    defaultValues: {
      alquiler_id: alquiler.id,
      fecha_devolucion_real: hoy,
      items: items.map((item) => ({
        alquiler_item_id: item.id,
        cantidad: item.cantidad,
        cantidad_ok: item.cantidad,
        cantidad_danada: 0,
        cantidad_faltante: 0,
        observaciones: "",
      })),
      costo_reparacion: 0,
      costo_reposicion: 0,
      observaciones: "",
      monto_cobrado: alquiler.saldo_pendiente,
      metodo_pago: "efectivo",
    },
  })

  const { dirtyFields } = form.formState
  const [valores, reparacion, reposicion] = useWatch({
    control: form.control,
    name: ["items", "costo_reparacion", "costo_reposicion"],
  })

  const reposicionSugerida = valores.reduce(
    (sum, valor, index) => sum + valor.cantidad_faltante * (items[index]?.disfraz?.precio_reposicion ?? 0),
    0
  )
  const totalACobrar = alquiler.saldo_pendiente + (reparacion ?? 0) + (reposicion ?? 0)

  // Mientras el usuario no edite los importes, se mantienen en sus valores sugeridos.
  useEffect(() => {
    if (!dirtyFields.costo_reposicion) form.setValue("costo_reposicion", reposicionSugerida)
  }, [reposicionSugerida, dirtyFields.costo_reposicion, form])

  useEffect(() => {
    if (!dirtyFields.monto_cobrado) form.setValue("monto_cobrado", totalACobrar)
  }, [totalACobrar, dirtyFields.monto_cobrado, form])

  const totalDanadas = valores.reduce((sum, v) => sum + v.cantidad_danada, 0)
  const totalFaltantes = valores.reduce((sum, v) => sum + v.cantidad_faltante, 0)
  const estado: EstadoDevolucion =
    totalDanadas > 0 && totalFaltantes > 0
      ? "con_danos_y_faltantes"
      : totalDanadas > 0
        ? "con_danos"
        : totalFaltantes > 0
          ? "con_faltantes"
          : "bueno"

  const montoCobrado = useWatch({ control: form.control, name: "monto_cobrado" }) ?? 0
  const quedaPendiente = Math.max(totalACobrar - montoCobrado, 0)

  function actualizar(index: number, campo: "cantidad_danada" | "cantidad_faltante", valor: number) {
    const actual = form.getValues(`items.${index}`)
    const otro = campo === "cantidad_danada" ? actual.cantidad_faltante : actual.cantidad_danada
    const limpio = Math.min(Math.max(0, valor), actual.cantidad - otro)
    form.setValue(`items.${index}.${campo}`, limpio)
    form.setValue(`items.${index}.cantidad_ok`, actual.cantidad - otro - limpio, { shouldValidate: true })
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (values.monto_cobrado > totalACobrar) {
      form.setError("monto_cobrado", { message: `No puede superar el total a cobrar (${formatCurrency(totalACobrar)})` })
      return
    }
    try {
      await registrar.mutateAsync(values)
      router.push(`/dashboard/alquileres/${alquiler.id}`)
    } catch (error) {
      handleMutationError(error, form.setError)
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <PageHeader
        title="Registrar devolución"
        description={
          <>
            {alquiler.cliente_nombre_completo} · alquilado el {formatDate(alquiler.fecha_alquiler)}, devolución pactada el{" "}
            {formatDate(alquiler.fecha_devolucion)}{" "}
            <Vencimiento estado={alquiler.estado} fechaDevolucion={alquiler.fecha_devolucion} className="ml-1" />
          </>
        }
        actions={
          <Button variant="ghost" asChild>
            <Link href={`/dashboard/alquileres/${alquiler.id}`}>
              <ArrowLeft />
              Volver
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estado de cada disfraz</CardTitle>
              <CardDescription>
                Indicá cuántas unidades vuelven dañadas (van a mantenimiento) o faltan (quedan como extraviadas). El resto
                vuelve disponible.
              </CardDescription>
              <CardAction>
                <StatusBadge tone={ESTADO_DEVOLUCION_TONE[estado]}>{ESTADO_DEVOLUCION_LABEL[estado]}</StatusBadge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ul className="divide-y rounded-lg border">
                {items.map((item, index) => {
                  const valor = valores[index]
                  const itemError = form.formState.errors.items?.[index]?.cantidad_ok
                  return (
                    <li key={item.id} className="space-y-3 p-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
                          {item.disfraz?.imagen_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.disfraz.imagen_url} alt="" className="size-full object-cover" loading="lazy" />
                          ) : (
                            <Shirt className="size-4 text-muted-foreground" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {item.disfraz?.nombre ?? "Disfraz"}{" "}
                            <span className="font-normal text-muted-foreground">· {item.disfraz?.talle}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.disfraz?.codigo} · {item.cantidad} alquilada{item.cantidad === 1 ? "" : "s"} · reposición{" "}
                            {formatCurrency(item.disfraz?.precio_reposicion ?? 0)}
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border bg-emerald-500/5 px-3 py-2">
                          <div className="text-xs text-muted-foreground">En buen estado</div>
                          <div className="font-heading text-xl font-semibold text-emerald-700 tabular dark:text-emerald-300">
                            {valor?.cantidad_ok ?? item.cantidad}
                          </div>
                        </div>
                        <CantidadStepper
                          label="Dañadas"
                          tone="warning"
                          value={valor?.cantidad_danada ?? 0}
                          max={item.cantidad - (valor?.cantidad_faltante ?? 0)}
                          onChange={(v) => actualizar(index, "cantidad_danada", v)}
                        />
                        <CantidadStepper
                          label="Faltantes"
                          tone="danger"
                          value={valor?.cantidad_faltante ?? 0}
                          max={item.cantidad - (valor?.cantidad_danada ?? 0)}
                          onChange={(v) => actualizar(index, "cantidad_faltante", v)}
                        />
                      </div>
                      <Input
                        {...form.register(`items.${index}.observaciones`)}
                        placeholder="Observaciones de este disfraz (daño, pieza faltante…)"
                        aria-label={`Observaciones de ${item.disfraz?.nombre ?? "disfraz"}`}
                        maxLength={300}
                      />
                      {itemError && <FieldError errors={[itemError]} />}
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fecha y cargos</CardTitle>
              <CardDescription>Los cargos se suman al saldo del alquiler.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DateField
                    control={form.control}
                    name="fecha_devolucion_real"
                    label="Fecha de devolución"
                    required
                    disabledDays={[{ before: parseDate(alquiler.fecha_alquiler) }, { after: parseDate(hoy) }]}
                  />
                  <MoneyField
                    control={form.control}
                    name="costo_reparacion"
                    label="Costo de reparación"
                    description={totalDanadas > 0 ? "Estimá el arreglo de las unidades dañadas." : undefined}
                  />
                  <MoneyField
                    control={form.control}
                    name="costo_reposicion"
                    label="Costo de reposición"
                    description={
                      reposicionSugerida > 0
                        ? `Sugerido: ${formatCurrency(reposicionSugerida)} (faltantes × precio de reposición)`
                        : "Se sugiere automáticamente si hay faltantes."
                    }
                  />
                  {dirtyFields.costo_reposicion && reposicion !== reposicionSugerida && (
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          form.setValue("costo_reposicion", reposicionSugerida, { shouldDirty: false, shouldValidate: true })
                        }
                      >
                        Usar sugerido ({formatCurrency(reposicionSugerida)})
                      </Button>
                    </div>
                  )}
                </div>
                <TextareaField
                  control={form.control}
                  name="observaciones"
                  label="Observaciones generales"
                  placeholder="Estado general, acuerdos con el cliente…"
                />
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Cobro</CardTitle>
              <CardDescription>Podés cobrar ahora o dejar saldo pendiente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo actual</span>
                <span className="tabular">{formatCurrency(alquiler.saldo_pendiente)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reparación</span>
                <span className="tabular">+ {formatCurrency(reparacion ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reposición</span>
                <span className="tabular">+ {formatCurrency(reposicion ?? 0)}</span>
              </div>
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="font-medium">Total a cobrar</span>
                <span className="font-heading text-2xl font-semibold tabular">{formatCurrency(totalACobrar)}</span>
              </div>
              <FieldGroup className="pt-2">
                <MoneyField control={form.control} name="monto_cobrado" label="Cobrar ahora" description="0 si no cobrás en este momento." />
                <SelectField control={form.control} name="metodo_pago" label="Método de pago" options={METODO_PAGO_OPTIONS} />
              </FieldGroup>
              <div
                className={cn(
                  "flex justify-between rounded-lg px-3 py-2",
                  quedaPendiente > 0 ? "bg-amber-500/10 text-amber-800 dark:text-amber-300" : "bg-muted text-muted-foreground"
                )}
              >
                <span>Queda pendiente</span>
                <span className="font-medium tabular">{formatCurrency(quedaPendiente)}</span>
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={registrar.isPending}>
                {registrar.isPending && <Spinner />}
                Confirmar devolución
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  )
}

const STEPPER_TONE = {
  warning: "bg-amber-500/5 text-amber-700 dark:text-amber-300",
  danger: "bg-rose-500/5 text-rose-600 dark:text-rose-400",
} as const

function CantidadStepper({
  label,
  value,
  max,
  onChange,
  tone,
}: {
  label: string
  value: number
  max: number
  onChange: (value: number) => void
  tone: keyof typeof STEPPER_TONE
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-lg border px-3 py-2", STEPPER_TONE[tone])}>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-heading text-xl font-semibold tabular">{value}</div>
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(value - 1)}
          disabled={value <= 0}
          aria-label={`Restar ${label.toLowerCase()}`}
        >
          <Minus />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={`Sumar ${label.toLowerCase()}`}
        >
          <Plus />
        </Button>
      </div>
    </div>
  )
}
