"use client"

import Link from "next/link"
import { CheckCircle2, Undo2 } from "lucide-react"

import { Vencimiento } from "@/components/alquileres/vencimiento"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAlquileresPendientes } from "@/hooks/use-alquileres"
import { ESTADO_ALQUILER_LABEL, ESTADO_ALQUILER_TONE } from "@/lib/constants"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Alquileres activos ordenados por vencimiento (atrasados primero), listos para devolver. */
export function DevolucionesPendientes() {
  const { data, isLoading } = useAlquileresPendientes()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCircle2 />
          </EmptyMedia>
          <EmptyTitle>No hay devoluciones pendientes</EmptyTitle>
          <EmptyDescription>Todos los disfraces alquilados ya fueron devueltos.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const atrasados = data.filter((a) => a.estado_efectivo === "atrasado").length

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {data.length} alquiler{data.length === 1 ? "" : "es"} por devolver
        {atrasados > 0 && (
          <span className="font-medium text-rose-600 dark:text-rose-400">
            {" "}
            · {atrasados} atrasado{atrasados === 1 ? "" : "s"}
          </span>
        )}
      </p>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs uppercase">Cliente</TableHead>
              <TableHead className="text-xs uppercase">Disfraces</TableHead>
              <TableHead className="text-xs uppercase">Devolución</TableHead>
              <TableHead className="text-xs uppercase">Estado</TableHead>
              <TableHead className="text-right text-xs uppercase">Saldo</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((alquiler) => (
              <TableRow key={alquiler.id} className={cn(alquiler.estado_efectivo === "atrasado" && "bg-rose-500/[0.03]")}>
                <TableCell>
                  <Link href={`/dashboard/alquileres/${alquiler.id}`} className="block min-w-0 hover:underline">
                    <div className="max-w-56 truncate font-medium">{alquiler.cliente_nombre_completo}</div>
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    DNI {alquiler.cliente_dni}
                    {alquiler.cliente_telefono ? ` · ${alquiler.cliente_telefono}` : ""}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-72 truncate text-sm" title={alquiler.resumen_items ?? undefined}>
                    {alquiler.resumen_items ?? "—"}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="text-sm tabular">{formatDate(alquiler.fecha_devolucion)}</div>
                  <Vencimiento estado={alquiler.estado} fechaDevolucion={alquiler.fecha_devolucion} />
                </TableCell>
                <TableCell>
                  <StatusBadge tone={ESTADO_ALQUILER_TONE[alquiler.estado_efectivo]}>
                    {ESTADO_ALQUILER_LABEL[alquiler.estado_efectivo]}
                  </StatusBadge>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular",
                    alquiler.saldo_pendiente > 0 ? "font-semibold text-amber-700 dark:text-amber-300" : "text-muted-foreground"
                  )}
                >
                  {formatCurrency(alquiler.saldo_pendiente)}
                </TableCell>
                <TableCell>
                  <Button size="sm" asChild>
                    <Link href={`/dashboard/alquileres/${alquiler.id}/devolver`}>
                      <Undo2 />
                      Devolver
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
