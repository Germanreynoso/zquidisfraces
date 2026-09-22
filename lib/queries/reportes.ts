import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database.types"
import type {
  AlquilerVista,
  CategoriaDisfraz,
  DisfrazVista,
  ReporteClientesFrecuentesFila,
  ReporteIngresosFila,
  ReporteMasAlquiladosFila,
} from "@/types/domain"

/**
 * Consultas de reportes. Reciben un cliente genérico para usarse igual desde el navegador
 * (hooks) y desde el route handler de exportación (cliente de servidor). RLS aplica en ambos casos.
 */
export type ReportesClient = SupabaseClient<Database>

export type Agrupacion = "dia" | "semana" | "mes"
export type RangoFechas = { desde: string; hasta: string }

export async function fetchReporteIngresos(
  supabase: ReportesClient,
  { desde, hasta, agrupacion }: RangoFechas & { agrupacion: Agrupacion }
): Promise<ReporteIngresosFila[]> {
  const { data, error } = await supabase.rpc("reporte_ingresos", {
    p_desde: desde,
    p_hasta: hasta,
    p_agrupacion: agrupacion,
  })
  if (error) throw error
  return data ?? []
}

export async function fetchReporteMasAlquilados(
  supabase: ReportesClient,
  { desde, hasta, limite = 50 }: RangoFechas & { limite?: number }
): Promise<ReporteMasAlquiladosFila[]> {
  const { data, error } = await supabase.rpc("reporte_mas_alquilados", {
    p_desde: desde,
    p_hasta: hasta,
    p_limite: limite,
  })
  if (error) throw error
  return data ?? []
}

export async function fetchReporteClientesFrecuentes(
  supabase: ReportesClient,
  { desde, hasta, limite = 50 }: RangoFechas & { limite?: number }
): Promise<ReporteClientesFrecuentesFila[]> {
  const { data, error } = await supabase.rpc("reporte_clientes_frecuentes", {
    p_desde: desde,
    p_hasta: hasta,
    p_limite: limite,
  })
  if (error) throw error
  return data ?? []
}

/** Inventario actual: disfraces activos (foto del momento, no depende del período). */
export async function fetchReporteInventario(supabase: ReportesClient): Promise<DisfrazVista[]> {
  const { data, error } = await supabase
    .from("v_disfraces")
    .select("*")
    .eq("activo", true)
    .order("categoria")
    .order("nombre")
    .order("talle")
    .limit(5000)
  if (error) throw error
  return (data ?? []) as DisfrazVista[]
}

/** Alquileres activos con la fecha de devolución vencida, del más atrasado al menos atrasado. */
export async function fetchReporteAtrasados(supabase: ReportesClient): Promise<AlquilerVista[]> {
  const { data, error } = await supabase
    .from("v_alquileres")
    .select("*")
    .eq("estado_efectivo", "atrasado")
    .order("fecha_devolucion", { ascending: true })
    .order("id")
    .limit(1000)
  if (error) throw error
  return (data ?? []) as AlquilerVista[]
}

// -----------------------------------------------------------------------------
// Agregaciones puras (compartidas por la UI y la exportación)
// -----------------------------------------------------------------------------
export type TotalesIngresos = { total: number; senas: number; saldos: number; cargos: number; cantidad_pagos: number }

export function totalizarIngresos(filas: ReporteIngresosFila[]): TotalesIngresos {
  return filas.reduce<TotalesIngresos>(
    (acc, fila) => ({
      total: acc.total + Number(fila.total),
      senas: acc.senas + Number(fila.senas),
      saldos: acc.saldos + Number(fila.saldos),
      cargos: acc.cargos + Number(fila.cargos),
      cantidad_pagos: acc.cantidad_pagos + Number(fila.cantidad_pagos),
    }),
    { total: 0, senas: 0, saldos: 0, cargos: 0, cantidad_pagos: 0 }
  )
}

export type ResumenCategoria = {
  categoria: CategoriaDisfraz
  modelos: number
  unidades: number
  disponibles: number
  alquiladas: number
  mantenimiento: number
  extraviadas: number
  valor_reposicion: number
}

export function resumirInventarioPorCategoria(disfraces: DisfrazVista[]): ResumenCategoria[] {
  const porCategoria = new Map<CategoriaDisfraz, ResumenCategoria>()
  for (const d of disfraces) {
    const actual = porCategoria.get(d.categoria) ?? {
      categoria: d.categoria,
      modelos: 0,
      unidades: 0,
      disponibles: 0,
      alquiladas: 0,
      mantenimiento: 0,
      extraviadas: 0,
      valor_reposicion: 0,
    }
    actual.modelos += 1
    actual.unidades += d.cantidad_total
    actual.disponibles += d.cantidad_disponible
    actual.alquiladas += d.cantidad_alquilada
    actual.mantenimiento += d.cantidad_mantenimiento
    actual.extraviadas += d.cantidad_extraviada
    actual.valor_reposicion += d.cantidad_total * Number(d.precio_reposicion)
    porCategoria.set(d.categoria, actual)
  }
  return [...porCategoria.values()].sort((a, b) => b.unidades - a.unidades)
}
