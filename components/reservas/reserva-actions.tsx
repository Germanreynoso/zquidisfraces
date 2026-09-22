"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Eye, MoreHorizontal, PackageCheck, XCircle } from "lucide-react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { esReservaVigente } from "@/components/reservas/reserva-periodo"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useActualizarEstadoReserva } from "@/hooks/use-reservas"
import { handleMutationError } from "@/lib/form-errors"
import type { EstadoReserva } from "@/types/domain"

type ReservaRef = { id: string; estado: EstadoReserva; cliente_nombre_completo: string }

/** Diálogo de cancelación reutilizable (fila y detalle). */
export function CancelarReservaDialog({
  reserva,
  open,
  onOpenChange,
}: {
  reserva: ReservaRef
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const actualizar = useActualizarEstadoReserva()
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="¿Cancelar la reserva?"
      description={`La reserva de ${reserva.cliente_nombre_completo} se cancela y los disfraces quedan liberados para esas fechas. No se puede deshacer.`}
      confirmLabel="Cancelar reserva"
      destructive
      onConfirm={async () => {
        try {
          await actualizar.mutateAsync({ id: reserva.id, estado: "cancelada" })
        } catch (error) {
          handleMutationError(error)
          return false
        }
      }}
    />
  )
}

/** Menú de acciones de una fila de reservas. */
export function ReservaRowActions({ reserva }: { reserva: ReservaRef }) {
  const [cancelando, setCancelando] = useState(false)
  const actualizar = useActualizarEstadoReserva()
  const vigente = esReservaVigente(reserva.estado)

  const confirmar = async () => {
    try {
      await actualizar.mutateAsync({ id: reserva.id, estado: "confirmada" })
    } catch (error) {
      handleMutationError(error)
    }
  }

  return (
    <div onClick={(event) => event.stopPropagation()} className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Acciones de la reserva de ${reserva.cliente_nombre_completo}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/reservas/${reserva.id}`}>
              <Eye />
              Ver detalle
            </Link>
          </DropdownMenuItem>
          {vigente && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/alquileres/nuevo?reserva=${reserva.id}`}>
                  <PackageCheck />
                  Registrar retiro
                </Link>
              </DropdownMenuItem>
              {reserva.estado === "pendiente" && (
                <DropdownMenuItem onSelect={confirmar} disabled={actualizar.isPending}>
                  <CheckCircle2 />
                  Confirmar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setCancelando(true)}>
                <XCircle />
                Cancelar reserva
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {vigente && <CancelarReservaDialog reserva={reserva} open={cancelando} onOpenChange={setCancelando} />}
    </div>
  )
}
