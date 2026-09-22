import type { BrowserSupabaseClient } from "@/lib/supabase/client"
import type { DevolucionVista, EstadoDevolucion } from "@/types/domain"

import { firstFilter, ilikeAny, pageRange, sanitizeSearch, type ListParams, type Paginated } from "./list-params"

const SORTABLE = new Set(["fecha_devolucion_real", "dias_atraso", "costo_reparacion", "costo_reposicion", "created_at"])

/** Devoluciones registradas (vista con cliente, atraso y unidades dañadas/faltantes). */
export async function fetchDevoluciones(
  supabase: BrowserSupabaseClient,
  params: ListParams
): Promise<Paginated<DevolucionVista>> {
  let query = supabase.from("v_devoluciones").select("*", { count: "exact" })

  const search = sanitizeSearch(params.search)
  if (search) query = query.or(ilikeAny(["cliente_nombre_completo", "cliente_dni", "observaciones"], search))

  const estados = firstFilter(params, "estado")
  if (estados) query = query.in("estado_disfraz", estados as EstadoDevolucion[])

  const sortId = params.sort && SORTABLE.has(params.sort.id) ? params.sort.id : "fecha_devolucion_real"
  const [from, to] = pageRange(params.page, params.pageSize)
  const { data, error, count } = await query
    .order(sortId, { ascending: !(params.sort?.desc ?? true) })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) throw error
  return { rows: (data ?? []) as DevolucionVista[], total: count ?? 0 }
}
