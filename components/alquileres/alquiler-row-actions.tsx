"use client"

import { useState } from "react"
import Link from "next/link"
import { Ban, Eye, MoreHorizontal, Undo2 } from "lucide-react"

import { CancelarAlquilerDialog } from "@/components/alquileres/cancelar-alquiler-dialog"
import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AlquilerVista } from "@/types/domain"

/** Acciones de una fila de alquiler: ver, registrar devolución y cancelar (admin). */
export function AlquilerRowActions({ alquiler }: { alquiler: AlquilerVista }) {
  const { isAdmin } = useSession()
  const [cancelando, setCancelando] = useState(false)
  const activo = alquiler.estado === "activo"

  return (
    <div onClick={(event) => event.stopPropagation()} className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Acciones del alquiler de ${alquiler.cliente_nombre_completo}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/alquileres/${alquiler.id}`}>
              <Eye />
              Ver detalle
            </Link>
          </DropdownMenuItem>
          {activo && (
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/alquileres/${alquiler.id}/devolver`}>
                <Undo2 />
                Registrar devolución
              </Link>
            </DropdownMenuItem>
          )}
          {isAdmin && activo && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setCancelando(true)}>
                <Ban />
                Cancelar alquiler
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {isAdmin && activo && (
        <CancelarAlquilerDialog
          open={cancelando}
          onOpenChange={setCancelando}
          alquilerId={alquiler.id}
          cliente={alquiler.cliente_nombre_completo}
        />
      )}
    </div>
  )
}
