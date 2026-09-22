"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { StatusBadge } from "@/components/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ESTADO_ALQUILER_LABEL,
  ESTADO_ALQUILER_TONE,
  ESTADO_RESERVA_LABEL,
  ESTADO_RESERVA_TONE,
} from "@/lib/constants"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AlquilerVista, ReservaVista } from "@/types/domain"

function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  )
}

function LoadingRows({ colSpan }: { colSpan: number }) {
  return Array.from({ length: 3 }).map((_, index) => (
    <TableRow key={index} className="hover:bg-transparent">
      <TableCell colSpan={colSpan}>
        <Skeleton className="h-5 w-full" />
      </TableCell>
    </TableRow>
  ))
}

type AlquileresProps = {
  alquileres: AlquilerVista[]
  isLoading?: boolean
  emptyMessage: string
}

/** Alquileres de un cliente con estado efectivo (incluye atrasados), fechas, total y saldo. */
export function ClienteAlquileresTable({ alquileres, isLoading, emptyMessage }: AlquileresProps) {
  const router = useRouter()

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead>Alquiler</TableHead>
            <TableHead>Devolución</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="hidden md:table-cell">Disfraces</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <LoadingRows colSpan={6} />
          ) : alquileres.length === 0 ? (
            <EmptyRow colSpan={6}>{emptyMessage}</EmptyRow>
          ) : (
            alquileres.map((alquiler) => (
              <TableRow
                key={alquiler.id}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/alquileres/${alquiler.id}`)}
              >
                <TableCell className="whitespace-nowrap">
                  <Link
                    href={`/dashboard/alquileres/${alquiler.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {formatDate(alquiler.fecha_alquiler)}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div>{formatDate(alquiler.fecha_devolucion)}</div>
                  {alquiler.dias_atraso > 0 && (
                    <div className="text-xs text-rose-600 dark:text-rose-400">
                      {alquiler.dias_atraso} día{alquiler.dias_atraso === 1 ? "" : "s"} de atraso
                    </div>
                  )}
                  {alquiler.fecha_devolucion_real && (
                    <div className="text-xs text-muted-foreground">Devuelto {formatDate(alquiler.fecha_devolucion_real)}</div>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge tone={ESTADO_ALQUILER_TONE[alquiler.estado_efectivo]}>
                    {ESTADO_ALQUILER_LABEL[alquiler.estado_efectivo]}
                  </StatusBadge>
                </TableCell>
                <TableCell className="hidden max-w-72 truncate text-sm text-muted-foreground md:table-cell">
                  {alquiler.resumen_items ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular">
                  {formatCurrency(alquiler.monto_total + alquiler.cargos_adicionales)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular",
                    alquiler.saldo_pendiente > 0 && alquiler.estado !== "cancelado"
                      ? "font-medium text-amber-700 dark:text-amber-300"
                      : "text-muted-foreground"
                  )}
                >
                  {formatCurrency(alquiler.estado === "cancelado" ? 0 : alquiler.saldo_pendiente)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

/** Reservas de un cliente. */
export function ClienteReservasTable({ reservas, isLoading }: { reservas: ReservaVista[]; isLoading?: boolean }) {
  const router = useRouter()

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead>Desde</TableHead>
            <TableHead>Hasta</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="hidden md:table-cell">Disfraces</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <LoadingRows colSpan={4} />
          ) : reservas.length === 0 ? (
            <EmptyRow colSpan={4}>El cliente no tiene reservas.</EmptyRow>
          ) : (
            reservas.map((reserva) => (
              <TableRow
                key={reserva.id}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/reservas/${reserva.id}`)}
              >
                <TableCell className="whitespace-nowrap">
                  <Link
                    href={`/dashboard/reservas/${reserva.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {formatDate(reserva.fecha_inicio)}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(reserva.fecha_fin)}</TableCell>
                <TableCell>
                  <StatusBadge tone={ESTADO_RESERVA_TONE[reserva.estado]}>{ESTADO_RESERVA_LABEL[reserva.estado]}</StatusBadge>
                </TableCell>
                <TableCell className="hidden max-w-80 truncate text-sm text-muted-foreground md:table-cell">
                  {reserva.resumen_items ?? "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
