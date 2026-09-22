"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, PackagePlus, Pencil, Shirt, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { AjustarStockDialog } from "@/components/inventario/ajustar-stock-dialog"
import { DisfrazFormSheet } from "@/components/inventario/disfraz-form-sheet"
import { useSession } from "@/components/session-provider"
import { StatusBadge } from "@/components/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDisfraz, useEliminarDisfraz, useMovimientosDisfraz, useOcupacionDisfraz } from "@/hooks/use-disfraces"
import {
  CATEGORIA_LABEL,
  ESTADO_DISFRAZ_LABEL,
  ESTADO_DISFRAZ_TONE,
  ESTADO_RESERVA_LABEL,
  ESTADO_RESERVA_TONE,
  TIPO_MOVIMIENTO_LABEL,
} from "@/lib/constants"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { handleMutationError } from "@/lib/form-errors"
import { cn } from "@/lib/utils"
import type { EstadoReserva, TipoMovimiento } from "@/types/domain"

const MOVIMIENTO_SIGNO: Partial<Record<TipoMovimiento, string>> = {
  alta: "+",
  baja: "−",
}

export function DisfrazDetail({ id }: { id: string }) {
  const router = useRouter()
  const { isAdmin } = useSession()
  const { data: disfraz, isLoading, error } = useDisfraz(id)
  const ocupacion = useOcupacionDisfraz(id)
  const movimientos = useMovimientosDisfraz(id)
  const eliminar = useEliminarDisfraz()
  const [dialogo, setDialogo] = useState<"editar" | "stock" | "eliminar" | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !disfraz) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se encontró el disfraz</AlertTitle>
        <AlertDescription>
          Puede haber sido eliminado. <Link href="/dashboard/inventario">Volver al inventario</Link>
        </AlertDescription>
      </Alert>
    )
  }

  const stock = [
    { label: "Disponibles", value: disfraz.cantidad_disponible, className: "text-emerald-600 dark:text-emerald-400" },
    { label: "Alquiladas", value: disfraz.cantidad_alquilada, className: "text-sky-600 dark:text-sky-400" },
    { label: "Mantenimiento", value: disfraz.cantidad_mantenimiento, className: "text-amber-600 dark:text-amber-400" },
    { label: "Extraviadas", value: disfraz.cantidad_extraviada, className: "text-rose-600 dark:text-rose-400" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="mt-1 shrink-0">
            <Link href="/dashboard/inventario" aria-label="Volver al inventario">
              <ArrowLeft />
            </Link>
          </Button>
          <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border bg-muted">
            {disfraz.imagen_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={disfraz.imagen_url} alt={disfraz.nombre} className="size-full object-cover" />
            ) : (
              <Shirt className="size-7 text-muted-foreground" />
            )}
          </span>
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-2xl font-semibold">{disfraz.nombre}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{disfraz.codigo}</span>
              <span>·</span>
              <span>{CATEGORIA_LABEL[disfraz.categoria]}</span>
              <span>·</span>
              <span>Talle {disfraz.talle}</span>
              <StatusBadge tone={ESTADO_DISFRAZ_TONE[disfraz.estado_efectivo]}>
                {ESTADO_DISFRAZ_LABEL[disfraz.estado_efectivo]}
              </StatusBadge>
              {disfraz.stock_bajo && <StatusBadge tone="warning">Stock bajo</StatusBadge>}
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDialogo("stock")}>
              <PackagePlus />
              Ajustar stock
            </Button>
            <Button variant="outline" onClick={() => setDialogo("editar")}>
              <Pencil />
              Editar
            </Button>
            <Button variant="destructive" onClick={() => setDialogo("eliminar")}>
              <Trash2 />
              Eliminar
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stock.map((item) => (
          <Card key={item.label} className="gap-1 p-4">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className={cn("font-heading text-3xl font-semibold tabular", item.className)}>{item.value}</span>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Precio de alquiler</dt>
              <dd className="text-right font-medium tabular">{formatCurrency(disfraz.precio_alquiler)}</dd>
              <dt className="text-muted-foreground">Precio de reposición</dt>
              <dd className="text-right font-medium tabular">{formatCurrency(disfraz.precio_reposicion)}</dd>
              <dt className="text-muted-foreground">Unidades totales</dt>
              <dd className="text-right font-medium tabular">{disfraz.cantidad_total}</dd>
              <dt className="text-muted-foreground">Stock mínimo</dt>
              <dd className="text-right font-medium tabular">{disfraz.stock_minimo}</dd>
              <dt className="text-muted-foreground">Reservadas hoy</dt>
              <dd className="text-right font-medium tabular">{disfraz.cantidad_reservada_hoy}</dd>
              <dt className="text-muted-foreground">Alta</dt>
              <dd className="text-right">{formatDate(disfraz.fecha_creacion)}</dd>
            </dl>
            {disfraz.descripcion && (
              <p className="mt-4 border-t pt-4 text-sm whitespace-pre-line text-muted-foreground">{disfraz.descripcion}</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <Tabs defaultValue="ocupacion" className="gap-0">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Actividad</CardTitle>
                <CardDescription>Quién lo tiene, quién lo reservó y su historial de stock.</CardDescription>
              </div>
              <TabsList>
                <TabsTrigger value="ocupacion">Ocupación</TabsTrigger>
                <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="ocupacion" className="space-y-6">
                <section className="space-y-2">
                  <h3 className="text-sm font-medium">Alquileres activos</h3>
                  {ocupacion.isLoading ? (
                    <Skeleton className="h-16" />
                  ) : ocupacion.data?.alquileres.length ? (
                    <ul className="divide-y rounded-lg border">
                      {ocupacion.data.alquileres.map((a) => (
                        <li key={a.alquiler_id}>
                          <Link
                            href={`/dashboard/alquileres/${a.alquiler_id}`}
                            className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                          >
                            <span className="truncate font-medium">{a.cliente}</span>
                            <span className="shrink-0 text-muted-foreground tabular">
                              ×{a.cantidad} · devuelve {formatDate(a.fecha_devolucion)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay unidades alquiladas.</p>
                  )}
                </section>
                <section className="space-y-2">
                  <h3 className="text-sm font-medium">Reservas vigentes</h3>
                  {ocupacion.isLoading ? (
                    <Skeleton className="h-16" />
                  ) : ocupacion.data?.reservas.length ? (
                    <ul className="divide-y rounded-lg border">
                      {ocupacion.data.reservas.map((r) => (
                        <li key={r.reserva_id}>
                          <Link
                            href={`/dashboard/reservas/${r.reserva_id}`}
                            className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate font-medium">{r.cliente}</span>
                              <StatusBadge tone={ESTADO_RESERVA_TONE[r.estado as EstadoReserva]}>
                                {ESTADO_RESERVA_LABEL[r.estado as EstadoReserva]}
                              </StatusBadge>
                            </span>
                            <span className="shrink-0 text-muted-foreground tabular">
                              ×{r.cantidad} · {formatDate(r.fecha_inicio)} → {formatDate(r.fecha_fin)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin reservas vigentes.</p>
                  )}
                </section>
              </TabsContent>
              <TabsContent value="movimientos">
                {movimientos.isLoading ? (
                  <Skeleton className="h-40" />
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Movimiento</TableHead>
                          <TableHead className="text-right">Cant.</TableHead>
                          <TableHead>Motivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(movimientos.data ?? []).map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {formatDateTime(m.created_at)}
                            </TableCell>
                            <TableCell>{TIPO_MOVIMIENTO_LABEL[m.tipo]}</TableCell>
                            <TableCell className="text-right font-medium tabular">
                              {MOVIMIENTO_SIGNO[m.tipo] ?? ""}
                              {m.cantidad}
                            </TableCell>
                            <TableCell className="max-w-64 truncate text-muted-foreground">
                              {m.motivo}
                              {m.usuario_nombre ? ` · ${m.usuario_nombre}` : ""}
                            </TableCell>
                          </TableRow>
                        ))}
                        {!movimientos.data?.length && (
                          <TableRow>
                            <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                              Sin movimientos registrados.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {isAdmin && (
        <>
          <DisfrazFormSheet
            open={dialogo === "editar"}
            onOpenChange={(open) => setDialogo(open ? "editar" : null)}
            disfraz={disfraz}
          />
          <AjustarStockDialog
            open={dialogo === "stock"}
            onOpenChange={(open) => setDialogo(open ? "stock" : null)}
            disfraz={disfraz}
          />
          <ConfirmDialog
            open={dialogo === "eliminar"}
            onOpenChange={(open) => setDialogo(open ? "eliminar" : null)}
            title={`¿Eliminar “${disfraz.nombre}”?`}
            description="El disfraz deja de estar disponible para alquilar. Su historial se conserva."
            confirmLabel="Eliminar"
            destructive
            onConfirm={async () => {
              try {
                await eliminar.mutateAsync(disfraz.id)
                router.push("/dashboard/inventario")
              } catch (err) {
                handleMutationError(err)
                return false
              }
            }}
          />
        </>
      )}
    </div>
  )
}
