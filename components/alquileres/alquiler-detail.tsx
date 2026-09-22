"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Ban, CalendarRange, HandCoins, Shirt, Undo2 } from "lucide-react"

import { CancelarAlquilerDialog } from "@/components/alquileres/cancelar-alquiler-dialog"
import { RegistrarPagoDialog } from "@/components/alquileres/registrar-pago-dialog"
import { Vencimiento } from "@/components/alquileres/vencimiento"
import { useSession } from "@/components/session-provider"
import { StatusBadge } from "@/components/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAlquiler } from "@/hooks/use-alquileres"
import {
  ESTADO_ALQUILER_LABEL,
  ESTADO_ALQUILER_TONE,
  ESTADO_DEVOLUCION_LABEL,
  ESTADO_DEVOLUCION_TONE,
  METODO_PAGO_LABEL,
  TIPO_PAGO_LABEL,
} from "@/lib/constants"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export function AlquilerDetail({ id }: { id: string }) {
  const { isAdmin } = useSession()
  const { data, isLoading, error } = useAlquiler(id)
  const [dialogo, setDialogo] = useState<"pago" | "cancelar" | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se encontró el alquiler</AlertTitle>
        <AlertDescription>
          Puede que no exista o no tengas acceso. <Link href="/dashboard/alquileres">Volver a alquileres</Link>
        </AlertDescription>
      </Alert>
    )
  }

  const { alquiler, items, pagos, devolucion } = data
  const activo = alquiler.estado === "activo"
  const cancelado = alquiler.estado === "cancelado"
  const totalFacturado = alquiler.monto_total + alquiler.cargos_adicionales
  const saldo = cancelado ? 0 : alquiler.saldo_pendiente
  const itemsPorId = new Map(items.map((item) => [item.id, item]))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0">
            <Link href="/dashboard/alquileres" aria-label="Volver a alquileres">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">Alquiler de {alquiler.cliente_nombre_completo}</h1>
              <StatusBadge tone={ESTADO_ALQUILER_TONE[alquiler.estado_efectivo]}>
                {ESTADO_ALQUILER_LABEL[alquiler.estado_efectivo]}
              </StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(alquiler.fecha_alquiler)} → {formatDate(alquiler.fecha_devolucion)} · registrado el{" "}
              {formatDateTime(alquiler.created_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!cancelado && saldo > 0 && (
            <Button variant="outline" onClick={() => setDialogo("pago")}>
              <HandCoins />
              Registrar pago
            </Button>
          )}
          {activo && (
            <Button asChild>
              <Link href={`/dashboard/alquileres/${alquiler.id}/devolver`}>
                <Undo2 />
                Registrar devolución
              </Link>
            </Button>
          )}
          {isAdmin && activo && (
            <Button variant="destructive" onClick={() => setDialogo("cancelar")}>
              <Ban />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {alquiler.estado_efectivo === "atrasado" && (
        <Alert variant="destructive">
          <AlertTitle>
            Devolución vencida hace {alquiler.dias_atraso} día{alquiler.dias_atraso === 1 ? "" : "s"}
          </AlertTitle>
          <AlertDescription>
            Debía devolverse el {formatDate(alquiler.fecha_devolucion)}.
            {alquiler.cliente_telefono ? ` Contacto: ${alquiler.cliente_telefono}.` : ""}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Disfraces</CardTitle>
              <CardDescription>
                {alquiler.cantidad_items} unidad{alquiler.cantidad_items === 1 ? "" : "es"} · precios al momento del alquiler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Disfraz</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">Unitario</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
                              {item.disfraz?.imagen_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.disfraz.imagen_url} alt="" className="size-full object-cover" loading="lazy" />
                              ) : (
                                <Shirt className="size-4 text-muted-foreground" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <Link
                                href={`/dashboard/inventario/${item.disfraz_id}`}
                                className="block truncate font-medium hover:underline"
                              >
                                {item.disfraz?.nombre ?? "Disfraz"}
                              </Link>
                              <div className="text-xs text-muted-foreground">
                                {item.disfraz?.codigo} · Talle {item.disfraz?.talle}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular">{item.cantidad}</TableCell>
                        <TableCell className="text-right tabular">{formatCurrency(item.precio_unitario)}</TableCell>
                        <TableCell className="text-right font-medium tabular">{formatCurrency(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3}>Total del alquiler</TableCell>
                      <TableCell className="text-right font-semibold tabular">{formatCurrency(alquiler.monto_total)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>

          {devolucion && (
            <Card>
              <CardHeader>
                <CardTitle>Devolución</CardTitle>
                <CardDescription>Registrada el {formatDate(devolucion.fecha_devolucion_real)}</CardDescription>
                <CardAction>
                  <StatusBadge tone={ESTADO_DEVOLUCION_TONE[devolucion.estado_disfraz]}>
                    {ESTADO_DEVOLUCION_LABEL[devolucion.estado_disfraz]}
                  </StatusBadge>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="divide-y rounded-lg border">
                  {devolucion.items.map((di) => {
                    const item = itemsPorId.get(di.alquiler_item_id)
                    return (
                      <li key={di.id} className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {item?.disfraz?.nombre ?? "Disfraz"}{" "}
                            <span className="font-normal text-muted-foreground">· {item?.disfraz?.talle}</span>
                          </div>
                          {di.observaciones && <div className="text-xs text-muted-foreground">{di.observaciones}</div>}
                        </div>
                        <div className="flex shrink-0 gap-3 text-xs tabular">
                          <span className="text-emerald-700 dark:text-emerald-300">{di.cantidad_ok} OK</span>
                          {di.cantidad_danada > 0 && (
                            <span className="text-amber-700 dark:text-amber-300">{di.cantidad_danada} dañada(s)</span>
                          )}
                          {di.cantidad_faltante > 0 && (
                            <span className="text-rose-600 dark:text-rose-400">{di.cantidad_faltante} faltante(s)</span>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Costo de reparación</dt>
                  <dd className="text-right tabular">{formatCurrency(devolucion.costo_reparacion)}</dd>
                  <dt className="text-muted-foreground">Costo de reposición</dt>
                  <dd className="text-right tabular">{formatCurrency(devolucion.costo_reposicion)}</dd>
                </dl>
                {devolucion.observaciones && (
                  <p className="border-t pt-3 text-sm whitespace-pre-line text-muted-foreground">{devolucion.observaciones}</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Pagos</CardTitle>
              <CardDescription>
                {pagos.length ? `${pagos.length} pago${pagos.length === 1 ? "" : "s"} registrado${pagos.length === 1 ? "" : "s"}` : "Sin pagos registrados"}
              </CardDescription>
              {!cancelado && saldo > 0 && (
                <CardAction>
                  <Button size="sm" variant="outline" onClick={() => setDialogo("pago")}>
                    <HandCoins />
                    Registrar pago
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              {pagos.length ? (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagos.map((pago) => (
                        <TableRow key={pago.id}>
                          <TableCell className="whitespace-nowrap tabular">{formatDate(pago.fecha)}</TableCell>
                          <TableCell>
                            {TIPO_PAGO_LABEL[pago.tipo]}
                            {pago.observaciones && (
                              <div className="max-w-56 truncate text-xs text-muted-foreground">{pago.observaciones}</div>
                            )}
                          </TableCell>
                          <TableCell>{METODO_PAGO_LABEL[pago.metodo]}</TableCell>
                          <TableCell className="text-right font-medium tabular">{formatCurrency(pago.monto)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Todavía no se registraron pagos para este alquiler.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Montos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total del alquiler</span>
                <span className="tabular">{formatCurrency(alquiler.monto_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cargos adicionales</span>
                <span className="tabular">{formatCurrency(alquiler.cargos_adicionales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total facturado</span>
                <span className="font-medium tabular">{formatCurrency(totalFacturado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pagado</span>
                <span className="tabular">− {formatCurrency(alquiler.monto_pagado)}</span>
              </div>
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="font-medium">Saldo pendiente</span>
                <span
                  className={cn(
                    "font-heading text-2xl font-semibold tabular",
                    saldo > 0 && "text-amber-700 dark:text-amber-300"
                  )}
                >
                  {formatCurrency(saldo)}
                </span>
              </div>
              {cancelado && alquiler.monto_pagado > 0 && (
                <p className="text-xs text-muted-foreground">El alquiler fue cancelado; los pagos registrados se conservan.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datos</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Cliente</dt>
                  <dd>
                    <Link href={`/dashboard/clientes/${alquiler.cliente_id}`} className="font-medium hover:underline">
                      {alquiler.cliente_nombre_completo}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      DNI {alquiler.cliente_dni}
                      {alquiler.cliente_telefono ? ` · ${alquiler.cliente_telefono}` : ""}
                    </div>
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-muted-foreground">Alquiler</dt>
                    <dd className="tabular">{formatDate(alquiler.fecha_alquiler)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Devolución pactada</dt>
                    <dd className="tabular">{formatDate(alquiler.fecha_devolucion)}</dd>
                    <Vencimiento
                      estado={alquiler.estado}
                      fechaDevolucion={alquiler.fecha_devolucion}
                      fechaDevolucionReal={alquiler.fecha_devolucion_real}
                    />
                  </div>
                </div>
                {alquiler.reserva_id && (
                  <div>
                    <dt className="text-muted-foreground">Origen</dt>
                    <dd>
                      <Link
                        href={`/dashboard/reservas/${alquiler.reserva_id}`}
                        className="inline-flex items-center gap-1.5 font-medium hover:underline"
                      >
                        <CalendarRange className="size-4" />
                        Ver reserva
                      </Link>
                    </dd>
                  </div>
                )}
                {alquiler.observaciones && (
                  <div>
                    <dt className="text-muted-foreground">Observaciones</dt>
                    <dd className="whitespace-pre-line">{alquiler.observaciones}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {!cancelado && saldo > 0 && (
        <RegistrarPagoDialog
          open={dialogo === "pago"}
          onOpenChange={(open) => setDialogo(open ? "pago" : null)}
          alquilerId={alquiler.id}
          saldo={saldo}
          fechaAlquiler={alquiler.fecha_alquiler}
          tieneCargos={alquiler.cargos_adicionales > 0 && alquiler.estado === "devuelto"}
        />
      )}
      {isAdmin && activo && (
        <CancelarAlquilerDialog
          open={dialogo === "cancelar"}
          onOpenChange={(open) => setDialogo(open ? "cancelar" : null)}
          alquilerId={alquiler.id}
          cliente={alquiler.cliente_nombre_completo}
        />
      )}
    </div>
  )
}
