"use client"

import { useQuery } from "@tanstack/react-query"

import {
  fetchIngresosRecientes,
  fetchProximasDevoluciones,
  fetchReservasProximas,
  fetchResumen,
  fetchTopDisfraces,
} from "@/lib/queries/dashboard"
import { queryKeys } from "@/lib/query-keys"
import { createClient } from "@/lib/supabase/client"

const REFRESH = 60_000

export function useResumen() {
  return useQuery({
    queryKey: queryKeys.dashboard.resumen(),
    queryFn: () => fetchResumen(createClient()),
    refetchInterval: REFRESH,
  })
}

export function useProximasDevoluciones() {
  return useQuery({
    queryKey: queryKeys.dashboard.proximasDevoluciones(),
    queryFn: () => fetchProximasDevoluciones(createClient()),
    refetchInterval: REFRESH,
  })
}

export function useReservasProximas() {
  return useQuery({
    queryKey: [...queryKeys.dashboard.root, "reservas-proximas"],
    queryFn: () => fetchReservasProximas(createClient()),
  })
}

export function useIngresosRecientes() {
  return useQuery({
    queryKey: [...queryKeys.dashboard.root, "ingresos-30"],
    queryFn: () => fetchIngresosRecientes(createClient()),
  })
}

export function useTopDisfraces() {
  return useQuery({
    queryKey: [...queryKeys.dashboard.root, "top-disfraces"],
    queryFn: () => fetchTopDisfraces(createClient()),
  })
}
