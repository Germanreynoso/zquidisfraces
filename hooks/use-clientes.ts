"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { unwrap } from "@/lib/action-result"
import { actualizarCliente, cambiarEstadoCliente, crearCliente } from "@/lib/actions/clientes"
import {
  fetchAlquileresCliente,
  fetchCliente,
  fetchClienteBasico,
  fetchClienteOpciones,
  fetchClientes,
  fetchReservasCliente,
} from "@/lib/queries/clientes"
import type { ListParams } from "@/lib/queries/list-params"
import { queryKeys } from "@/lib/query-keys"
import { createClient } from "@/lib/supabase/client"
import type { ClienteInput } from "@/lib/validations/clientes"

export function useClienteOpciones(search: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.clientes.opciones(search),
    queryFn: () => fetchClienteOpciones(createClient(), search),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useClienteBasico(id: string | null | undefined) {
  return useQuery({
    queryKey: [...queryKeys.clientes.root, "basico", id],
    queryFn: () => fetchClienteBasico(createClient(), id!),
    enabled: Boolean(id),
  })
}

export function useCrearCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ClienteInput) => unwrap(await crearCliente(input)),
    onSuccess: () => {
      toast.success("Cliente creado")
      return queryClient.invalidateQueries({ queryKey: queryKeys.clientes.root })
    },
  })
}

export function useActualizarCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ClienteInput }) => unwrap(await actualizarCliente(id, input)),
    onSuccess: () => {
      toast.success("Cliente actualizado")
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.clientes.root }),
        queryClient.invalidateQueries({ queryKey: queryKeys.alquileres.root }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reservas.root }),
      ])
    },
  })
}

export function useCambiarEstadoCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => unwrap(await cambiarEstadoCliente(id, activo)),
    onSuccess: (_data, { activo }) => {
      toast.success(activo ? "Cliente reactivado" : "Cliente dado de baja")
      return queryClient.invalidateQueries({ queryKey: queryKeys.clientes.root })
    },
  })
}

export function useClientes(params: ListParams) {
  return useQuery({
    queryKey: queryKeys.clientes.list(params),
    queryFn: () => fetchClientes(createClient(), params),
    placeholderData: keepPreviousData,
  })
}

export function useCliente(id: string) {
  return useQuery({
    queryKey: queryKeys.clientes.detail(id),
    queryFn: () => fetchCliente(createClient(), id),
  })
}

export function useAlquileresCliente(clienteId: string) {
  return useQuery({
    queryKey: queryKeys.clientes.alquileres(clienteId),
    queryFn: () => fetchAlquileresCliente(createClient(), clienteId),
  })
}

export function useReservasCliente(clienteId: string) {
  return useQuery({
    queryKey: [...queryKeys.clientes.root, "reservas", clienteId],
    queryFn: () => fetchReservasCliente(createClient(), clienteId),
  })
}
