"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { unwrap } from "@/lib/action-result"
import { actualizarEstadoReserva, crearReserva } from "@/lib/actions/reservas"
import type { ListParams } from "@/lib/queries/list-params"
import { fetchReserva, fetchReservas } from "@/lib/queries/reservas"
import { invalidateOperational, queryKeys } from "@/lib/query-keys"
import { createClient } from "@/lib/supabase/client"
import type { EstadoReservaInput, ReservaInput } from "@/lib/validations/reservas"

export function useReservas(params: ListParams) {
  return useQuery({
    queryKey: queryKeys.reservas.list(params),
    queryFn: () => fetchReservas(createClient(), params),
    placeholderData: keepPreviousData,
  })
}

export function useReserva(id: string) {
  return useQuery({
    queryKey: queryKeys.reservas.detail(id),
    queryFn: () => fetchReserva(createClient(), id),
  })
}

export function useCrearReserva() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ReservaInput) => unwrap(await crearReserva(input)),
    onSuccess: () => {
      toast.success("Reserva creada")
      // Una reserva cambia disponibilidad, alertas, calendario y KPIs.
      return invalidateOperational(queryClient)
    },
  })
}

export function useActualizarEstadoReserva() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: EstadoReservaInput) => unwrap(await actualizarEstadoReserva(input)),
    onSuccess: (_data, { estado }) => {
      toast.success(estado === "confirmada" ? "Reserva confirmada" : "Reserva cancelada")
      return invalidateOperational(queryClient)
    },
  })
}
