"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { fetchEventosCalendario } from "@/lib/queries/calendario"
import { queryKeys } from "@/lib/query-keys"
import { createClient } from "@/lib/supabase/client"

export type RangoCalendario = { desde: string; hasta: string }

/** Eventos del rango visible del calendario (hasta exclusivo). */
export function useEventosCalendario(rango: RangoCalendario | null) {
  return useQuery({
    queryKey: queryKeys.calendario.eventos(rango?.desde ?? "", rango?.hasta ?? ""),
    queryFn: () => fetchEventosCalendario(createClient(), rango!.desde, rango!.hasta),
    enabled: Boolean(rango),
    placeholderData: keepPreviousData,
  })
}
