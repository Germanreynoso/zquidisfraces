"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { unwrap } from "@/lib/action-result"
import { cancelarAlquiler, crearAlquiler, registrarPago } from "@/lib/actions/alquileres"
import {
  fetchAlquilerDetalle,
  fetchAlquileres,
  fetchAlquileresPendientes,
  fetchReservaParaAlquiler,
} from "@/lib/queries/alquileres"
import type { ListParams } from "@/lib/queries/list-params"
import { invalidateOperational, queryKeys } from "@/lib/query-keys"
import { createClient } from "@/lib/supabase/client"
import type { CancelarAlquilerInput, CrearAlquilerInput, PagoInput } from "@/lib/validations/alquileres"

export function useAlquileres(params: ListParams) {
  return useQuery({
    queryKey: queryKeys.alquileres.list(params),
    queryFn: () => fetchAlquileres(createClient(), params),
    placeholderData: keepPreviousData,
  })
}

export function useAlquileresPendientes() {
  return useQuery({
    queryKey: [...queryKeys.alquileres.root, "pendientes"],
    queryFn: () => fetchAlquileresPendientes(createClient()),
  })
}

export function useAlquiler(id: string) {
  return useQuery({
    queryKey: queryKeys.alquileres.detail(id),
    queryFn: () => fetchAlquilerDetalle(createClient(), id),
  })
}

export function useReservaParaAlquiler(reservaId: string | null | undefined) {
  return useQuery({
    queryKey: [...queryKeys.reservas.root, "para-alquiler", reservaId],
    queryFn: () => fetchReservaParaAlquiler(createClient(), reservaId!),
    enabled: Boolean(reservaId),
  })
}

export function useCrearAlquiler() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CrearAlquilerInput) => unwrap(await crearAlquiler(input)),
    onSuccess: () => {
      toast.success("Alquiler registrado")
      return invalidateOperational(queryClient)
    },
  })
}

export function useCancelarAlquiler() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CancelarAlquilerInput) => unwrap(await cancelarAlquiler(input)),
    onSuccess: () => {
      toast.success("Alquiler cancelado: las unidades volvieron al stock")
      return invalidateOperational(queryClient)
    },
  })
}

export function useRegistrarPago() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PagoInput) => unwrap(await registrarPago(input)),
    onSuccess: () => {
      toast.success("Pago registrado")
      return invalidateOperational(queryClient)
    },
  })
}
