"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, MoreHorizontal, PackagePlus, Pencil, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { AjustarStockDialog } from "@/components/inventario/ajustar-stock-dialog"
import { DisfrazFormSheet } from "@/components/inventario/disfraz-form-sheet"
import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEliminarDisfraz } from "@/hooks/use-disfraces"
import { handleMutationError } from "@/lib/form-errors"
import type { DisfrazVista } from "@/types/domain"

type Dialogo = "editar" | "stock" | "eliminar" | null

/** Menú de acciones de una fila de inventario. */
export function DisfrazRowActions({ disfraz, onDeleted }: { disfraz: DisfrazVista; onDeleted?: () => void }) {
  const { isAdmin } = useSession()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const eliminar = useEliminarDisfraz()

  return (
    <div onClick={(event) => event.stopPropagation()} className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${disfraz.nombre}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/inventario/${disfraz.id}`}>
              <Eye />
              Ver detalle
            </Link>
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuItem onSelect={() => setDialogo("editar")}>
                <Pencil />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialogo("stock")}>
                <PackagePlus />
                Ajustar stock
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDialogo("eliminar")}>
                <Trash2 />
                Eliminar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {isAdmin && (
        <>
          <DisfrazFormSheet open={dialogo === "editar"} onOpenChange={(open) => setDialogo(open ? "editar" : null)} disfraz={disfraz} />
          <AjustarStockDialog open={dialogo === "stock"} onOpenChange={(open) => setDialogo(open ? "stock" : null)} disfraz={disfraz} />
          <ConfirmDialog
            open={dialogo === "eliminar"}
            onOpenChange={(open) => setDialogo(open ? "eliminar" : null)}
            title={`¿Eliminar “${disfraz.nombre}”?`}
            description="El disfraz deja de estar disponible para alquilar. Su historial se conserva. No se puede eliminar si tiene unidades alquiladas o reservas vigentes."
            confirmLabel="Eliminar"
            destructive
            onConfirm={async () => {
              try {
                await eliminar.mutateAsync(disfraz.id)
                onDeleted?.()
              } catch (error) {
                handleMutationError(error)
                return false
              }
            }}
          />
        </>
      )}
    </div>
  )
}
