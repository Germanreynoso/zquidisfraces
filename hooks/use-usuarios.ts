"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { unwrap } from "@/lib/action-result"
import { cambiarEstadoUsuario, cambiarRolUsuario, crearUsuario, listarUsuarios } from "@/lib/actions/usuarios"
import { queryKeys } from "@/lib/query-keys"
import type { CambiarEstadoUsuarioInput, CambiarRolInput, CrearUsuarioInput } from "@/lib/validations/usuarios"

/** Usuarios del sistema (solo admin). Se leen vía Server Action porque combinan perfiles y Auth. */
export function useUsuarios() {
  return useQuery({
    queryKey: queryKeys.usuarios.list(),
    queryFn: async () => unwrap(await listarUsuarios()),
  })
}

export function useCrearUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CrearUsuarioInput) => unwrap(await crearUsuario(input)),
    onSuccess: (data) => {
      if (data.perfilConfigurado) {
        toast.success("Usuario creado y habilitado")
      } else {
        toast.warning("El usuario se creó, pero no se pudo configurar su rol. Revisalo en la lista y habilitalo.")
      }
      return queryClient.invalidateQueries({ queryKey: queryKeys.usuarios.root })
    },
  })
}

export function useCambiarRolUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CambiarRolInput) => unwrap(await cambiarRolUsuario(input)),
    onSuccess: () => {
      toast.success("Rol actualizado")
      return queryClient.invalidateQueries({ queryKey: queryKeys.usuarios.root })
    },
  })
}

export function useCambiarEstadoUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CambiarEstadoUsuarioInput) => unwrap(await cambiarEstadoUsuario(input)),
    onSuccess: (_data, { activo }) => {
      toast.success(activo ? "Usuario habilitado" : "Usuario desactivado")
      return queryClient.invalidateQueries({ queryKey: queryKeys.usuarios.root })
    },
  })
}
