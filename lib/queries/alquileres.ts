import { addDaysISO, todayISO } from "@/lib/format"
import type { BrowserSupabaseClient } from "@/lib/supabase/client"
import type { AlquilerVista, Devolucion, DevolucionItem, DisfrazVista, EstadoAlquiler, EstadoReserva, Pago } from "@/types/domain"

import { firstFilter, ilikeAny, pageRange, sanitizeSearch, type ListParams, type Paginated } from "./list-params"

const SORTABLE = new Set(["fecha_alquiler", "fecha_devolucion", "monto_total", "saldo_pendiente", "created_at"])

/** Listado paginado de alquileres (vista con estado efectivo, cliente y resumen de items). */
export async function fetchAlquileres(
  supabase: BrowserSupabaseClient,
  params: ListParams
): Promise<Paginated<AlquilerVista>> {
  let query = supabase.from("v_alquileres").select("*", { count: "exact" })

  const search = sanitizeSearch(params.search)
  if (search) query = query.or(ilikeAny(["cliente_nombre_completo", "cliente_dni", "resumen_items"], search))

  const estados = firstFilter(params, "estado")
  if (estados) query = query.in("estado_efectivo", estados as EstadoAlquiler[])

  const vence = firstFilter(params, "vence")
  if (vence) {
    const hoy = todayISO()
    query = query.eq("estado", "activo")
    if (vence.includes("semana")) query = query.gte("fecha_devolucion", hoy).lte("fecha_devolucion", addDaysISO(hoy, 7))
    else if (vence.includes("hoy")) query = query.eq("fecha_devolucion", hoy)
  }

  const sortId = params.sort && SORTABLE.has(params.sort.id) ? params.sort.id : "fecha_alquiler"
  const [from, to] = pageRange(params.page, params.pageSize)
  const { data, error, count } = await query
    .order(sortId, { ascending: !(params.sort?.desc ?? true) })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) throw error
  return { rows: (data ?? []) as AlquilerVista[], total: count ?? 0 }
}

/** Alquileres activos (incluye atrasados), ordenados por vencimiento: los atrasados quedan primero. */
export async function fetchAlquileresPendientes(supabase: BrowserSupabaseClient): Promise<AlquilerVista[]> {
  const { data, error } = await supabase
    .from("v_alquileres")
    .select("*")
    .eq("estado", "activo")
    .order("fecha_devolucion", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(300)
  if (error) throw error
  return (data ?? []) as AlquilerVista[]
}

export type AlquilerItemDetalle = {
  id: string
  disfraz_id: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  disfraz: {
    id: string
    codigo: string
    nombre: string
    talle: string
    imagen_url: string | null
    precio_reposicion: number
  } | null
}

export type AlquilerDetalle = {
  alquiler: AlquilerVista
  items: AlquilerItemDetalle[]
  pagos: Pago[]
  devolucion: (Devolucion & { items: DevolucionItem[] }) | null
}

export async function fetchAlquilerDetalle(supabase: BrowserSupabaseClient, id: string): Promise<AlquilerDetalle> {
  const [alquiler, items, pagos, devolucion] = await Promise.all([
    supabase.from("v_alquileres").select("*").eq("id", id).single(),
    supabase
      .from("alquiler_items")
      .select("id, disfraz_id, cantidad, precio_unitario, subtotal, disfraces(id, codigo, nombre, talle, imagen_url, precio_reposicion)")
      .eq("alquiler_id", id),
    supabase.from("pagos").select("*").eq("alquiler_id", id).order("fecha").order("created_at"),
    supabase.from("devoluciones").select("*, devolucion_items(*)").eq("alquiler_id", id).maybeSingle(),
  ])
  if (alquiler.error) throw alquiler.error
  if (items.error) throw items.error
  if (pagos.error) throw pagos.error
  if (devolucion.error) throw devolucion.error

  const itemsDetalle: AlquilerItemDetalle[] = (items.data ?? [])
    .map((row) => ({
      id: row.id,
      disfraz_id: row.disfraz_id,
      cantidad: row.cantidad,
      precio_unitario: row.precio_unitario,
      subtotal: row.subtotal ?? row.cantidad * row.precio_unitario,
      disfraz: row.disfraces ?? null,
    }))
    .sort((a, b) => (a.disfraz?.nombre ?? "").localeCompare(b.disfraz?.nombre ?? "", "es"))

  let devolucionDetalle: AlquilerDetalle["devolucion"] = null
  if (devolucion.data) {
    const { devolucion_items, ...resto } = devolucion.data
    devolucionDetalle = { ...resto, items: devolucion_items ?? [] }
  }

  return {
    alquiler: alquiler.data as AlquilerVista,
    items: itemsDetalle,
    pagos: pagos.data ?? [],
    devolucion: devolucionDetalle,
  }
}

export type ReservaParaAlquiler = {
  id: string
  estado: EstadoReserva
  fecha_inicio: string
  fecha_fin: string
  observaciones: string | null
  cliente: { id: string; nombre: string; apellido: string; dni: string } | null
  items: { disfraz_id: string; cantidad: number; disfraz: DisfrazVista | null }[]
}

/** Reserva con sus items y los datos actuales de cada disfraz, para registrar su retiro. */
export async function fetchReservaParaAlquiler(
  supabase: BrowserSupabaseClient,
  reservaId: string
): Promise<ReservaParaAlquiler> {
  const { data: reserva, error } = await supabase
    .from("reservas")
    .select("id, estado, fecha_inicio, fecha_fin, observaciones, clientes(id, nombre, apellido, dni), reserva_items(disfraz_id, cantidad)")
    .eq("id", reservaId)
    .single()
  if (error) throw error

  const ids = (reserva.reserva_items ?? []).map((item) => item.disfraz_id)
  const disfraces = new Map<string, DisfrazVista>()
  if (ids.length) {
    const { data, error: disfracesError } = await supabase.from("v_disfraces").select("*").in("id", ids)
    if (disfracesError) throw disfracesError
    for (const d of (data ?? []) as DisfrazVista[]) disfraces.set(d.id, d)
  }

  return {
    id: reserva.id,
    estado: reserva.estado,
    fecha_inicio: reserva.fecha_inicio,
    fecha_fin: reserva.fecha_fin,
    observaciones: reserva.observaciones,
    cliente: reserva.clientes ?? null,
    items: (reserva.reserva_items ?? []).map((item) => ({
      disfraz_id: item.disfraz_id,
      cantidad: item.cantidad,
      disfraz: disfraces.get(item.disfraz_id) ?? null,
    })),
  }
}
