import { todayISO } from "@/lib/format"
import type { BrowserSupabaseClient } from "@/lib/supabase/client"
import type { CategoriaDisfraz, EstadoReserva, ReservaVista } from "@/types/domain"

import { firstFilter, ilikeAny, pageRange, sanitizeSearch, type ListParams, type Paginated } from "./list-params"

const SORTABLE = new Set(["fecha_inicio", "fecha_fin", "created_at", "cliente_nombre_completo"])

/**
 * Listado paginado de reservas (vista con datos del cliente y resumen de disfraces).
 * Filtros: estado (multi) y periodo: "proximas" (no finalizadas) / "pasadas" (fecha_fin < hoy).
 */
export async function fetchReservas(supabase: BrowserSupabaseClient, params: ListParams): Promise<Paginated<ReservaVista>> {
  let query = supabase.from("v_reservas").select("*", { count: "exact" })

  const search = sanitizeSearch(params.search)
  if (search) query = query.or(ilikeAny(["cliente_nombre_completo", "cliente_dni", "resumen_items"], search))

  const estados = firstFilter(params, "estado")
  if (estados) query = query.in("estado", estados as EstadoReserva[])

  const periodo = firstFilter(params, "periodo")
  if (periodo && periodo.length === 1) {
    const hoy = todayISO()
    query = periodo[0] === "pasadas" ? query.lt("fecha_fin", hoy) : query.gte("fecha_fin", hoy)
  }

  const sortId = params.sort && SORTABLE.has(params.sort.id) ? params.sort.id : "fecha_inicio"
  const [from, to] = pageRange(params.page, params.pageSize)
  const { data, error, count } = await query
    .order(sortId, { ascending: !(params.sort?.desc ?? false) })
    .order("id")
    .range(from, to)

  if (error) throw error
  return { rows: (data ?? []) as ReservaVista[], total: count ?? 0 }
}

export type ReservaItemDetalle = {
  id: string
  cantidad: number
  disfraz: {
    id: string
    codigo: string
    nombre: string
    talle: string
    categoria: CategoriaDisfraz
    imagen_url: string | null
    activo: boolean
  }
}

export type ReservaDetalle = ReservaVista & { items: ReservaItemDetalle[] }

export async function fetchReserva(supabase: BrowserSupabaseClient, id: string): Promise<ReservaDetalle> {
  const [reserva, items] = await Promise.all([
    supabase.from("v_reservas").select("*").eq("id", id).single(),
    supabase
      .from("reserva_items")
      .select("id, cantidad, disfraces(id, codigo, nombre, talle, categoria, imagen_url, activo)")
      .eq("reserva_id", id),
  ])
  if (reserva.error) throw reserva.error
  if (items.error) throw items.error

  return {
    ...(reserva.data as ReservaVista),
    items: (items.data ?? [])
      .map((row) => ({ id: row.id, cantidad: row.cantidad, disfraz: row.disfraces }))
      .sort((a, b) => a.disfraz.nombre.localeCompare(b.disfraz.nombre, "es")),
  }
}
