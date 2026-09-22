import type { BrowserSupabaseClient } from "@/lib/supabase/client"
import type { AlquilerVista, ClienteVista, ReservaVista } from "@/types/domain"

import { firstFilter, ilikeAny, pageRange, sanitizeSearch, type ListParams, type Paginated } from "./list-params"

/** Opciones para el selector de clientes (activos que coinciden con nombre, apellido o DNI). */
export async function fetchClienteOpciones(supabase: BrowserSupabaseClient, search: string): Promise<ClienteVista[]> {
  let query = supabase.from("v_clientes").select("*").eq("activo", true)
  const term = sanitizeSearch(search)
  if (term) query = query.or(ilikeAny(["nombre", "apellido", "dni", "nombre_completo", "telefono"], term))
  const { data, error } = await query.order("apellido").order("nombre").limit(20)
  if (error) throw error
  return (data ?? []) as ClienteVista[]
}

export type ClienteBasico = { id: string; nombre: string; apellido: string; dni: string; activo: boolean }

/** Datos mínimos de un cliente (para precargar selectores desde ?cliente=<id>). */
export async function fetchClienteBasico(supabase: BrowserSupabaseClient, id: string): Promise<ClienteBasico> {
  const { data, error } = await supabase.from("clientes").select("id, nombre, apellido, dni, activo").eq("id", id).single()
  if (error) throw error
  return data
}

const CLIENTES_SORTABLE = new Set([
  "apellido",
  "nombre",
  "dni",
  "total_alquileres",
  "ultimo_alquiler",
  "saldo_pendiente_total",
])

/** Condiciones del filtro "Estado de cuenta" (se combinan con OR). */
const CUENTA_CONDICIONES: Record<string, string> = {
  activos: "alquileres_activos.gt.0",
  vencidos: "alquileres_vencidos.gt.0",
  saldo: "saldo_pendiente_total.gt.0",
}

/** Listado paginado de clientes con métricas de alquileres (v_clientes). */
export async function fetchClientes(
  supabase: BrowserSupabaseClient,
  params: ListParams
): Promise<Paginated<ClienteVista>> {
  let query = supabase.from("v_clientes").select("*", { count: "exact" })

  const search = sanitizeSearch(params.search)
  if (search) query = query.or(ilikeAny(["nombre", "apellido", "nombre_completo", "dni", "telefono", "email"], search))

  const estados = firstFilter(params, "estado")
  if (estados && estados.length === 1) query = query.eq("activo", estados[0] === "activos")

  const cuenta = firstFilter(params, "cuenta")
    ?.map((value) => CUENTA_CONDICIONES[value])
    .filter(Boolean)
  if (cuenta?.length) query = query.or(cuenta.join(","))

  const sortId = params.sort && CLIENTES_SORTABLE.has(params.sort.id) ? params.sort.id : "apellido"
  const ascending = !(params.sort?.desc ?? false)
  query = query.order(sortId, { ascending, nullsFirst: false })
  if (sortId === "apellido") query = query.order("nombre", { ascending })

  const [from, to] = pageRange(params.page, params.pageSize)
  const { data, error, count } = await query.order("id").range(from, to)

  if (error) throw error
  return { rows: (data ?? []) as ClienteVista[], total: count ?? 0 }
}

export async function fetchCliente(supabase: BrowserSupabaseClient, id: string): Promise<ClienteVista> {
  const { data, error } = await supabase.from("v_clientes").select("*").eq("id", id).single()
  if (error) throw error
  return data as ClienteVista
}

/** Historial completo de alquileres de un cliente (más recientes primero). */
export async function fetchAlquileresCliente(supabase: BrowserSupabaseClient, clienteId: string): Promise<AlquilerVista[]> {
  const { data, error } = await supabase
    .from("v_alquileres")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("fecha_alquiler", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500)
  if (error) throw error
  return (data ?? []) as AlquilerVista[]
}

export async function fetchReservasCliente(supabase: BrowserSupabaseClient, clienteId: string): Promise<ReservaVista[]> {
  const { data, error } = await supabase
    .from("v_reservas")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("fecha_inicio", { ascending: false })
    .limit(200)
  if (error) throw error
  return (data ?? []) as ReservaVista[]
}
