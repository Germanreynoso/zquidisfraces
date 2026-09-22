import type { BrowserSupabaseClient } from "@/lib/supabase/client"
import type { CategoriaDisfraz, DisfrazVista, EstadoDisfraz, MovimientoVista, TipoMovimiento } from "@/types/domain"

import { firstFilter, ilikeAny, pageRange, sanitizeSearch, type ListParams, type Paginated } from "./list-params"

const SORTABLE = new Set([
  "codigo",
  "nombre",
  "categoria",
  "talle",
  "cantidad_disponible",
  "cantidad_total",
  "precio_alquiler",
  "fecha_creacion",
])

/** Listado paginado de disfraces activos (vista con estado efectivo y reservas de hoy). */
export async function fetchDisfraces(
  supabase: BrowserSupabaseClient,
  params: ListParams
): Promise<Paginated<DisfrazVista>> {
  let query = supabase.from("v_disfraces").select("*", { count: "exact" }).eq("activo", true)

  const search = sanitizeSearch(params.search)
  if (search) query = query.or(ilikeAny(["nombre", "codigo", "talle", "descripcion"], search))

  const categorias = firstFilter(params, "categoria")
  if (categorias) query = query.in("categoria", categorias as CategoriaDisfraz[])

  const estados = firstFilter(params, "estado")
  if (estados) query = query.in("estado_efectivo", estados as EstadoDisfraz[])

  const talles = firstFilter(params, "talle")
  if (talles) query = query.in("talle", talles)

  if (firstFilter(params, "stock")?.includes("bajo")) query = query.eq("stock_bajo", true)

  const sortId = params.sort && SORTABLE.has(params.sort.id) ? params.sort.id : "nombre"
  const [from, to] = pageRange(params.page, params.pageSize)
  const { data, error, count } = await query
    .order(sortId, { ascending: !(params.sort?.desc ?? false) })
    .order("id")
    .range(from, to)

  if (error) throw error
  return { rows: (data ?? []) as DisfrazVista[], total: count ?? 0 }
}

export async function fetchDisfraz(supabase: BrowserSupabaseClient, id: string): Promise<DisfrazVista> {
  const { data, error } = await supabase.from("v_disfraces").select("*").eq("id", id).single()
  if (error) throw error
  return data as DisfrazVista
}

/** Opciones para selectores: activos que coinciden con la búsqueda. */
export async function fetchDisfrazOpciones(supabase: BrowserSupabaseClient, search: string): Promise<DisfrazVista[]> {
  let query = supabase.from("v_disfraces").select("*").eq("activo", true)
  const term = sanitizeSearch(search)
  if (term) query = query.or(ilikeAny(["nombre", "codigo", "talle"], term))
  const { data, error } = await query.order("nombre").order("talle").limit(25)
  if (error) throw error
  return (data ?? []) as DisfrazVista[]
}

/** Talles existentes (para el filtro de la tabla). */
export async function fetchTalles(supabase: BrowserSupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.from("disfraces").select("talle").eq("activo", true).limit(2000)
  if (error) throw error
  return [...new Set((data ?? []).map((row) => row.talle))].sort((a, b) => a.localeCompare(b, "es"))
}

/**
 * Unidades disponibles por disfraz en el rango [inicio, fin], contemplando alquileres activos y reservas.
 * Con excluirReservaId se ignora esa reserva (al convertirla en alquiler).
 */
export async function fetchDisponibilidad(
  supabase: BrowserSupabaseClient,
  inicio: string,
  fin: string,
  excluirReservaId?: string | null
): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc("disponibilidad_rango", {
    p_inicio: inicio,
    p_fin: fin,
    ...(excluirReservaId ? { p_excluir_reserva_id: excluirReservaId } : {}),
  })
  if (error) throw error
  return new Map((data ?? []).map((row) => [row.disfraz_id, row.disponible]))
}

export async function fetchMovimientosDisfraz(
  supabase: BrowserSupabaseClient,
  disfrazId: string
): Promise<MovimientoVista[]> {
  const { data, error } = await supabase
    .from("v_movimientos_stock")
    .select("*")
    .eq("disfraz_id", disfrazId)
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []) as MovimientoVista[]
}

const MOVIMIENTOS_SORTABLE = new Set(["created_at", "tipo", "cantidad", "disfraz_nombre"])

export async function fetchMovimientos(
  supabase: BrowserSupabaseClient,
  params: ListParams
): Promise<Paginated<MovimientoVista>> {
  let query = supabase.from("v_movimientos_stock").select("*", { count: "exact" })

  const search = sanitizeSearch(params.search)
  if (search) query = query.or(ilikeAny(["disfraz_nombre", "disfraz_codigo", "motivo"], search))

  const tipos = firstFilter(params, "tipo")
  if (tipos) query = query.in("tipo", tipos as TipoMovimiento[])

  const sortId = params.sort && MOVIMIENTOS_SORTABLE.has(params.sort.id) ? params.sort.id : "created_at"
  const [from, to] = pageRange(params.page, params.pageSize)
  const { data, error, count } = await query
    .order(sortId, { ascending: !(params.sort?.desc ?? true) })
    .order("id")
    .range(from, to)

  if (error) throw error
  return { rows: (data ?? []) as MovimientoVista[], total: count ?? 0 }
}

export type OcupacionDisfraz = {
  alquileres: {
    alquiler_id: string
    cantidad: number
    fecha_alquiler: string
    fecha_devolucion: string
    cliente: string
  }[]
  reservas: {
    reserva_id: string
    cantidad: number
    fecha_inicio: string
    fecha_fin: string
    estado: string
    cliente: string
  }[]
}

/** Alquileres activos y reservas vigentes que ocupan un disfraz. */
export async function fetchOcupacionDisfraz(supabase: BrowserSupabaseClient, disfrazId: string): Promise<OcupacionDisfraz> {
  const [alquileres, reservas] = await Promise.all([
    supabase
      .from("alquiler_items")
      .select("cantidad, alquileres!inner(id, fecha_alquiler, fecha_devolucion, estado, clientes(nombre, apellido))")
      .eq("disfraz_id", disfrazId)
      .eq("alquileres.estado", "activo"),
    supabase
      .from("reserva_items")
      .select("cantidad, reservas!inner(id, fecha_inicio, fecha_fin, estado, clientes(nombre, apellido))")
      .eq("disfraz_id", disfrazId)
      .in("reservas.estado", ["pendiente", "confirmada"]),
  ])
  if (alquileres.error) throw alquileres.error
  if (reservas.error) throw reservas.error

  return {
    alquileres: (alquileres.data ?? [])
      .map((row) => ({
        alquiler_id: row.alquileres.id,
        cantidad: row.cantidad,
        fecha_alquiler: row.alquileres.fecha_alquiler,
        fecha_devolucion: row.alquileres.fecha_devolucion,
        cliente: row.alquileres.clientes ? `${row.alquileres.clientes.apellido}, ${row.alquileres.clientes.nombre}` : "—",
      }))
      .sort((a, b) => a.fecha_devolucion.localeCompare(b.fecha_devolucion)),
    reservas: (reservas.data ?? [])
      .map((row) => ({
        reserva_id: row.reservas.id,
        cantidad: row.cantidad,
        fecha_inicio: row.reservas.fecha_inicio,
        fecha_fin: row.reservas.fecha_fin,
        estado: row.reservas.estado,
        cliente: row.reservas.clientes ? `${row.reservas.clientes.apellido}, ${row.reservas.clientes.nombre}` : "—",
      }))
      .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio)),
  }
}
