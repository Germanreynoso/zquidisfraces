"use client"

import { useQuery } from "@tanstack/react-query"

import { fetchAlertas } from "@/lib/queries/alertas"
import { queryKeys } from "@/lib/query-keys"
import { createClient } from "@/lib/supabase/client"

/** Alertas del centro de notificaciones. Se refrescan cada minuto. */
export function useAlertas() {
  return useQuery({
    queryKey: queryKeys.alertas.list(),
    queryFn: () => fetchAlertas(createClient()),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}
