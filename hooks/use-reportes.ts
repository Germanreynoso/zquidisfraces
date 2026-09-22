"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import {
  fetchReporteAtrasados,
  fetchReporteClientesFrecuentes,
  fetchReporteIngresos,
  fetchReporteInventario,
  fetchReporteMasAlquilados,
  type Agrupacion,
} from "@/lib/queries/reportes"
import { createClient } from "@/lib/supabase/client"

export function useReporteIngresos(desde: string, hasta: string, agrupacion: Agrupacion) {
  return useQuery({
    queryKey: queryKeys.reportes.ingresos(desde, hasta, agrupacion),
    queryFn: () => fetchReporteIngresos(createClient(), { desde, hasta, agrupacion }),
    placeholderData: keepPreviousData,
    enabled: Boolean(desde && hasta && hasta >= desde),
  })
}

export function useReporteMasAlquilados(desde: string, hasta: string) {
  return useQuery({
    queryKey: queryKeys.reportes.masAlquilados(desde, hasta),
    queryFn: () => fetchReporteMasAlquilados(createClient(), { desde, hasta }),
    placeholderData: keepPreviousData,
    enabled: Boolean(desde && hasta && hasta >= desde),
  })
}

export function useReporteClientesFrecuentes(desde: string, hasta: string) {
  return useQuery({
    queryKey: queryKeys.reportes.clientesFrecuentes(desde, hasta),
    queryFn: () => fetchReporteClientesFrecuentes(createClient(), { desde, hasta }),
    placeholderData: keepPreviousData,
    enabled: Boolean(desde && hasta && hasta >= desde),
  })
}

export function useReporteInventario() {
  return useQuery({
    queryKey: [...queryKeys.reportes.root, "inventario"],
    queryFn: () => fetchReporteInventario(createClient()),
  })
}

export function useReporteAtrasados() {
  return useQuery({
    queryKey: queryKeys.reportes.atrasados(),
    queryFn: () => fetchReporteAtrasados(createClient()),
  })
}
