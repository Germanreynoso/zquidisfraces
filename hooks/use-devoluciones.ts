"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { unwrap } from "@/lib/action-result"
import { registrarDevolucion } from "@/lib/actions/devoluciones"
import { fetchDevoluciones } from "@/lib/queries/devoluciones"
import type { ListParams } from "@/lib/queries/list-params"
import { invalidateOperational, queryKeys } from "@/lib/query-keys"
import { createClient } from "@/lib/supabase/client"
import type { DevolucionInput } from "@/lib/validations/devoluciones"

export function useDevoluciones(params: ListParams) {
  return useQuery({
    queryKey: queryKeys.devoluciones.list(params),
    queryFn: () => fetchDevoluciones(createClient(), params),
    placeholderData: keepPreviousData,
  })
}

export function useRegistrarDevolucion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: DevolucionInput) => unwrap(await registrarDevolucion(input)),
    onSuccess: () => {
      toast.success("Devolución registrada")
      return invalidateOperational(queryClient)
    },
  })
}
