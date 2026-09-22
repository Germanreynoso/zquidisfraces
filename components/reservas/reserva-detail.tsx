"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, ExternalLink, PackageCheck, Phone, Shirt, XCircle } from "lucide-react"

import { CancelarReservaDialog } from "@/components/reservas/reserva-actions"
import { duracionDias, esReservaVigente, periodoRelativo } from "@/components/reservas/reserva-periodo"
import { StatusBadge } from "@/components/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useActualizarEstadoReserva, useReserva } from "@/hooks/use-reservas"
import { CATEGORIA_LABEL, ESTADO_RESERVA_LABEL, ESTADO_RESERVA_TONE } from "@/lib/constants"
import { formatDate, formatDateLong, formatDateTime } from "@/lib/format"
import { handleMutationError } from "@/lib/form-errors"

export function ReservaDetail({ id }: { id: string }) {
  const { data: reserva, isLoading, error } = useReserva(id)
  const actualizar = useActualizarEstadoReserva()
  const [cancelando, setCancelando] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  if (error || !reserva) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se encontró la reserva</AlertTitle>
        <AlertDescription>
          Puede que no exista o que no tengas acceso. <Link href="/dashboard/reservas">Volver a reservas</Link>
        </AlertDescription>
      </Alert>
    )
  }

  const vigente = esReservaVigente(reserva.estado)
  const unidades = reserva.items.reduce((sum, item) => sum + item.cantidad, 0)

  const confirmar = async () => {
    try {
      await actualizar.mutateAsync({ id: reserva.id, estado: "confirmada" })
    } catch (err) {
      handleMutationError(err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0">
            <Link href="/dashboard/reservas" aria-label="Volver a reservas">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-2xl font-semibold">Reserva de {reserva.cliente_nombre_completo}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <StatusBadge tone={ESTADO_RESERVA_TONE[reserva.estado]}>{ESTADO_RESERVA_LABEL[reserva.estado]}</StatusBadge>
              <span className="tabular">
                {formatDate(reserva.fecha_inicio)} → {formatDate(reserva.fecha_fin)}
              </span>
              {vigente && (
                <>
                  <span>·</span>
                  <span className="font-medium text-foreground">
                    {periodoRelativo(reserva.fecha_inicio, reserva.fecha_fin)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {reserva.estado === "convertida" && reserva.alquiler_id && (
            <Button asChild>
              <Link href={`/dashboard/alquileres/${reserva.alquiler_id}`}>
                <ExternalLink />
                Ver alquiler
              </Link>
            </Button>
          )}
          {vigente && (
            <>
              {reserva.estado === "pendiente" && (
                <Button variant="outline" onClick={confirmar} disabled={actualizar.isPending}>
                  {actualizar.isPending ? <Spinner /> : <CheckCircle2 />}
                  Confirmar
                </Button>
              )}
              <Button variant="destructive" onClick={() => setCancelando(true)}>
                <XCircle />
                Cancelar
              </Button>
              <Button asChild>
                <Link href={`/dashboard/alquileres/nuevo?reserva=${reserva.id}`}>
                  <PackageCheck />
                  Registrar retiro
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link
              href={`/dashboard/clientes/${reserva.cliente_id}`}
              className="block font-medium underline-offset-4 hover:underline"
            >
              {reserva.cliente_nombre_completo}
            </Link>
            <div className="text-muted-foreground">DNI {reserva.cliente_dni}</div>
            {reserva.cliente_telefono && (
              <a
                href={`tel:${reserva.cliente_telefono.replace(/[^\d+]/g, "")}`}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Phone className="size-3.5" />
                {reserva.cliente_telefono}
              </a>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Período</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Retira</dt>
              <dd className="text-right capitalize">{formatDateLong(reserva.fecha_inicio)}</dd>
              <dt className="text-muted-foreground">Devuelve</dt>
              <dd className="text-right capitalize">{formatDateLong(reserva.fecha_fin)}</dd>
              <dt className="text-muted-foreground">Duración</dt>
              <dd className="text-right tabular">{duracionDias(reserva.fecha_inicio, reserva.fecha_fin)} día(s)</dd>
              <dt className="text-muted-foreground">Registrada</dt>
              <dd className="text-right text-muted-foreground">{formatDateTime(reserva.created_at)}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line text-muted-foreground">
              {reserva.observaciones || "Sin observaciones."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Disfraces reservados</CardTitle>
          <CardDescription>
            {reserva.items.length} modelo(s) · {unidades} unidad{unidades === 1 ? "" : "es"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14" />
                  <TableHead>Disfraz</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Talle</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reserva.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="grid size-10 place-items-center overflow-hidden rounded-lg border bg-muted">
                        {item.disfraz.imagen_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.disfraz.imagen_url} alt="" className="size-full object-cover" loading="lazy" />
                        ) : (
                          <Shirt className="size-4 text-muted-foreground" />
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/inventario/${item.disfraz.id}`}
                        className="block font-medium underline-offset-4 hover:underline"
                      >
                        {item.disfraz.nombre}
                      </Link>
                      <span className="font-mono text-xs text-muted-foreground">{item.disfraz.codigo}</span>
                      {!item.disfraz.activo && <span className="ml-2 text-xs text-rose-600">(dado de baja)</span>}
                    </TableCell>
                    <TableCell className="text-sm">{CATEGORIA_LABEL[item.disfraz.categoria]}</TableCell>
                    <TableCell className="text-sm">{item.disfraz.talle}</TableCell>
                    <TableCell className="text-right font-medium tabular">{item.cantidad}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {vigente && <CancelarReservaDialog reserva={reserva} open={cancelando} onOpenChange={setCancelando} />}
    </div>
  )
}
