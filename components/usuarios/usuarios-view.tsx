"use client"

import { useState } from "react"
import { MoreHorizontal, RefreshCw, ShieldCheck, UserCheck, UserPlus, UserRound, UserX } from "lucide-react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { UsuarioFormDialog } from "@/components/usuarios/usuario-form-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCambiarEstadoUsuario, useCambiarRolUsuario, useUsuarios } from "@/hooks/use-usuarios"
import type { UsuarioFila } from "@/lib/actions/usuarios"
import { ROL_LABEL } from "@/lib/constants"
import { formatDate, formatDateTime, initials } from "@/lib/format"
import { handleMutationError } from "@/lib/form-errors"

type Pendiente =
  | { tipo: "rol"; usuario: UsuarioFila; rol: UsuarioFila["rol"] }
  | { tipo: "estado"; usuario: UsuarioFila; activo: boolean }
  | null

export function UsuariosView({ currentUserId }: { currentUserId: string }) {
  const { data: usuarios, isLoading, error, refetch, isFetching } = useUsuarios()
  const cambiarRol = useCambiarRolUsuario()
  const cambiarEstado = useCambiarEstadoUsuario()
  const [creating, setCreating] = useState(false)
  const [pendiente, setPendiente] = useState<Pendiente>(null)

  const pendientesHabilitar = usuarios?.filter((u) => !u.activo).length ?? 0

  async function confirmar() {
    if (!pendiente) return
    try {
      if (pendiente.tipo === "rol") {
        await cambiarRol.mutateAsync({ userId: pendiente.usuario.id, rol: pendiente.rol })
      } else {
        await cambiarEstado.mutateAsync({ userId: pendiente.usuario.id, activo: pendiente.activo })
      }
    } catch (err) {
      handleMutationError(err)
      return false
    }
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Quién accede al sistema y con qué permisos."
        actions={
          <>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} aria-label="Actualizar">
              <RefreshCw className={isFetching ? "animate-spin" : undefined} />
            </Button>
            <Button onClick={() => setCreating(true)}>
              <UserPlus />
              Nuevo usuario
            </Button>
          </>
        }
      />

      {pendientesHabilitar > 0 && (
        <Alert>
          <UserRound />
          <AlertTitle>
            {pendientesHabilitar} usuario{pendientesHabilitar === 1 ? "" : "s"} sin habilitar
          </AlertTitle>
          <AlertDescription>
            Los usuarios inactivos no pueden ver ni modificar datos. Habilitalos solo si los reconocés.
          </AlertDescription>
        </Alert>
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar los usuarios</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Último acceso</TableHead>
                <TableHead className="hidden lg:table-cell">Alta</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index} className="hover:bg-transparent">
                      <TableCell colSpan={6}>
                        <Skeleton className="h-9 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : (usuarios ?? []).map((usuario) => {
                    const esYo = usuario.id === currentUserId
                    const nombre = usuario.nombre || usuario.email || "Sin nombre"
                    return (
                      <TableRow key={usuario.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 rounded-lg">
                              <AvatarFallback className="rounded-lg bg-primary/12 text-xs font-medium text-primary">
                                {initials(nombre)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="max-w-48 truncate font-medium">{nombre}</span>
                                {esYo && (
                                  <Badge variant="secondary" className="rounded-sm px-1.5 font-normal">
                                    Vos
                                  </Badge>
                                )}
                              </div>
                              <div className="max-w-56 truncate text-xs text-muted-foreground">{usuario.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone={usuario.rol === "admin" ? "violet" : "neutral"} dot={false}>
                            {usuario.rol === "admin" && <ShieldCheck className="size-3" />}
                            {ROL_LABEL[usuario.rol]}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          {usuario.activo ? (
                            <StatusBadge tone="success">Activo</StatusBadge>
                          ) : (
                            <StatusBadge tone="warning">Pendiente</StatusBadge>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {usuario.last_sign_in_at ? formatDateTime(usuario.last_sign_in_at) : "Nunca"}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          {formatDate(usuario.created_at)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${nombre}`}>
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel>Rol</DropdownMenuLabel>
                              <DropdownMenuItem
                                disabled={usuario.rol === "admin"}
                                onSelect={() => setPendiente({ tipo: "rol", usuario, rol: "admin" })}
                              >
                                <ShieldCheck />
                                Hacer administrador
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={usuario.rol === "empleado" || esYo}
                                onSelect={() => setPendiente({ tipo: "rol", usuario, rol: "empleado" })}
                              >
                                <UserRound />
                                Hacer empleado
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {usuario.activo ? (
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={esYo}
                                  onSelect={() => setPendiente({ tipo: "estado", usuario, activo: false })}
                                >
                                  <UserX />
                                  Desactivar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onSelect={() => setPendiente({ tipo: "estado", usuario, activo: true })}>
                                  <UserCheck />
                                  Habilitar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
            </TableBody>
          </Table>
        </div>
      )}

      <UsuarioFormDialog open={creating} onOpenChange={setCreating} />

      <ConfirmDialog
        open={pendiente !== null}
        onOpenChange={(open) => !open && setPendiente(null)}
        title={tituloConfirmacion(pendiente)}
        description={descripcionConfirmacion(pendiente)}
        confirmLabel="Confirmar"
        destructive={pendiente?.tipo === "estado" && !pendiente.activo}
        onConfirm={confirmar}
      />
    </>
  )
}

function nombreDe(usuario: UsuarioFila) {
  return usuario.nombre || usuario.email || "este usuario"
}

function tituloConfirmacion(pendiente: Pendiente): string {
  if (!pendiente) return ""
  if (pendiente.tipo === "rol") {
    return `¿Cambiar a ${nombreDe(pendiente.usuario)} a ${ROL_LABEL[pendiente.rol].toLowerCase()}?`
  }
  return pendiente.activo ? `¿Habilitar a ${nombreDe(pendiente.usuario)}?` : `¿Desactivar a ${nombreDe(pendiente.usuario)}?`
}

function descripcionConfirmacion(pendiente: Pendiente): string {
  if (!pendiente) return ""
  if (pendiente.tipo === "rol") {
    return pendiente.rol === "admin"
      ? "Tendrá acceso total: precios, stock, cancelaciones y gestión de usuarios."
      : "Podrá operar alquileres, devoluciones, reservas y clientes, pero no modificar inventario, precios ni usuarios."
  }
  return pendiente.activo
    ? "Podrá ingresar y operar según su rol."
    : "Ya no podrá ver ni modificar datos. Podés volver a habilitarlo cuando quieras."
}
