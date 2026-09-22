"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { unwrap } from "@/lib/action-result"
import { actualizarDisfraz, ajustarStock, crearDisfraz, eliminarDisfraz } from "@/lib/actions/disfraces"
import {
  fetchDisfraces,
  fetchDisfraz,
  fetchDisfrazOpciones,
  fetchDisponibilidad,
  fetchMovimientos,
  fetchMovimientosDisfraz,
  fetchOcupacionDisfraz,
  fetchTalles,
} from "@/lib/queries/disfraces"
import type { ListParams } from "@/lib/queries/list-params"
import { invalidateOperational, queryKeys } from "@/lib/query-keys"
import { createClient } from "@/lib/supabase/client"
import type { AjusteStockInput, DisfrazBaseInput, DisfrazCreateInput } from "@/lib/validations/disfraces"

export function useDisfraces(params: ListParams) {
  return useQuery({
    queryKey: queryKeys.disfraces.list(params),
    queryFn: () => fetchDisfraces(createClient(), params),
    placeholderData: keepPreviousData,
  })
}

export function useDisfraz(id: string) {
  return useQuery({
    queryKey: queryKeys.disfraces.detail(id),
    queryFn: () => fetchDisfraz(createClient(), id),
  })
}

export function useDisfrazOpciones(search: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.disfraces.opciones(search),
    queryFn: () => fetchDisfrazOpciones(createClient(), search),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useTalles() {
  return useQuery({
    queryKey: [...queryKeys.disfraces.root, "talles"],
    queryFn: () => fetchTalles(createClient()),
    staleTime: 5 * 60_000,
  })
}

export function useDisponibilidad(inicio?: string, fin?: string, excluirReservaId?: string | null) {
  return useQuery({
    queryKey: queryKeys.disponibilidad.rango(inicio ?? "", fin ?? "", excluirReservaId),
    queryFn: () => fetchDisponibilidad(createClient(), inicio!, fin!, excluirReservaId),
    enabled: Boolean(inicio && fin && fin >= inicio),
    staleTime: 10_000,
  })
}

export function useMovimientosDisfraz(disfrazId: string) {
  return useQuery({
    queryKey: queryKeys.disfraces.movimientos(disfrazId),
    queryFn: () => fetchMovimientosDisfraz(createClient(), disfrazId),
  })
}

export function useMovimientos(params: ListParams) {
  return useQuery({
    queryKey: [...queryKeys.disfraces.root, "movimientos-list", params],
    queryFn: () => fetchMovimientos(createClient(), params),
    placeholderData: keepPreviousData,
  })
}

export function useOcupacionDisfraz(disfrazId: string) {
  return useQuery({
    queryKey: [...queryKeys.disfraces.root, "ocupacion", disfrazId],
    queryFn: () => fetchOcupacionDisfraz(createClient(), disfrazId),
  })
}

export function useCrearDisfraz() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: DisfrazCreateInput) => unwrap(await crearDisfraz(input)),
    onSuccess: () => {
      toast.success("Disfraz creado")
      return invalidateOperational(queryClient)
    },
  })
}

export function useActualizarDisfraz() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: DisfrazBaseInput }) =>
      unwrap(await actualizarDisfraz(id, input)),
    onSuccess: () => {
      toast.success("Cambios guardados")
      return queryClient.invalidateQueries({ queryKey: queryKeys.disfraces.root })
    },
  })
}

export function useEliminarDisfraz() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await eliminarDisfraz(id)),
    onSuccess: () => {
      toast.success("Disfraz dado de baja")
      return invalidateOperational(queryClient)
    },
  })
}

export function useAjustarStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AjusteStockInput) => unwrap(await ajustarStock(input)),
    onSuccess: () => {
      toast.success("Stock actualizado")
      return invalidateOperational(queryClient)
    },
  })
}
