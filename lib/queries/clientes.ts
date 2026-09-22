import type { BrowserSupabaseClient } from "@/lib/supabase/client"
import type { ClienteVista } from "@/types/domain"

import { ilikeAny, sanitizeSearch } from "./list-params"

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
