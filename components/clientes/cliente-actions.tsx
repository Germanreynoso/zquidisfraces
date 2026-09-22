"use client"

import { useState } from "react"
import Link from "next/link"
import { CalendarPlus, Eye, MoreHorizontal, Pencil, Receipt, UserCheck, UserX } from "lucide-react"

import { ClienteFormDialog } from "@/components/clientes/cliente-form-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCambiarEstadoCliente } from "@/hooks/use-clientes"
import { handleMutationError } from "@/lib/form-errors"
import type { ClienteVista } from "@/types/domain"

type Dialogo = "editar" | "estado" | null

/** Diálogo de baja/reactivación de un cliente (solo admin). */
export function CambiarEstadoClienteDialog({
  cliente,
  open,
  onOpenChange,
}: {
  cliente: Pick<ClienteVista, "id" | "nombre_completo" | "activo">
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const cambiarEstado = useCambiarEstadoCliente()
  const reactivar = !cliente.activo

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={reactivar ? `¿Reactivar a ${cliente.nombre_completo}?` : `¿Dar de baja a ${cliente.nombre_completo}?`}
      description={
        reactivar
          ? "El cliente vuelve a estar disponible para alquileres y reservas."
          : "No podrá seleccionarse en nuevos alquileres ni reservas. Su historial se conserva y podés reactivarlo cuando quieras."
      }
      confirmLabel={reactivar ? "Reactivar" : "Dar de baja"}
      destructive={!reactivar}
      onConfirm={async () => {
        try {
          await cambiarEstado.mutateAsync({ id: cliente.id, activo: reactivar })
        } catch (error) {
          handleMutationError(error)
          return false
        }
      }}
    />
  )
}

/** Menú de acciones de una fila de clientes. */
export function ClienteRowActions({ cliente }: { cliente: ClienteVista }) {
  const { isAdmin } = useSession()
  const [dialogo, setDialogo] = useState<Dialogo>(null)

  return (
    <div onClick={(event) => event.stopPropagation()} className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${cliente.nombre_completo}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/clientes/${cliente.id}`}>
              <Eye />
              Ver detalle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialogo("editar")}>
            <Pencil />
            Editar
          </DropdownMenuItem>
          {cliente.activo && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/alquileres/nuevo?cliente=${cliente.id}`}>
                  <Receipt />
                  Nuevo alquiler
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/reservas/nueva?cliente=${cliente.id}`}>
                  <CalendarPlus />
                  Nueva reserva
                </Link>
              </DropdownMenuItem>
            </>
          )}
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              {cliente.activo ? (
                <DropdownMenuItem variant="destructive" onSelect={() => setDialogo("estado")}>
                  <UserX />
                  Dar de baja
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setDialogo("estado")}>
                  <UserCheck />
                  Reactivar
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ClienteFormDialog
        open={dialogo === "editar"}
        onOpenChange={(open) => setDialogo(open ? "editar" : null)}
        cliente={cliente}
      />
      {isAdmin && (
        <CambiarEstadoClienteDialog
          cliente={cliente}
          open={dialogo === "estado"}
          onOpenChange={(open) => setDialogo(open ? "estado" : null)}
        />
      )}
    </div>
  )
}
