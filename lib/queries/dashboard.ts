import { addDaysISO, todayISO } from "@/lib/format"
import type { BrowserSupabaseClient } from "@/lib/supabase/client"
import type {
  AlquilerVista,
  DashboardResumen,
  ReporteIngresosFila,
  ReporteMasAlquiladosFila,
  ReservaVista,
} from "@/types/domain"

export async function fetchResumen(supabase: BrowserSupabaseClient): Promise<DashboardResumen> {
  const { data, error } = await supabase.rpc("dashboard_resumen")
  if (error) throw error
  return data as unknown as DashboardResumen
}

/** Alquileres activos ordenados por vencimiento (los atrasados primero). */
export async function fetchProximasDevoluciones(supabase: BrowserSupabaseClient, limit = 8): Promise<AlquilerVista[]> {
  const { data, error } = await supabase
    .from("v_alquileres")
    .select("*")
    .eq("estado", "activo")
    .order("fecha_devolucion", { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as AlquilerVista[]
}

export async function fetchReservasProximas(supabase: BrowserSupabaseClient, limit = 6): Promise<ReservaVista[]> {
  const { data, error } = await supabase
    .from("v_reservas")
    .select("*")
    .in("estado", ["pendiente", "confirmada"])
    .gte("fecha_inicio", todayISO())
    .order("fecha_inicio", { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as ReservaVista[]
}

export async function fetchIngresosRecientes(supabase: BrowserSupabaseClient, dias = 30): Promise<ReporteIngresosFila[]> {
  const hasta = todayISO()
  const { data, error } = await supabase.rpc("reporte_ingresos", {
    p_desde: addDaysISO(hasta, -(dias - 1)),
    p_hasta: hasta,
    p_agrupacion: "dia",
  })
  if (error) throw error
  return data ?? []
}

export async function fetchTopDisfraces(supabase: BrowserSupabaseClient, dias = 90): Promise<ReporteMasAlquiladosFila[]> {
  const hasta = todayISO()
  const { data, error } = await supabase.rpc("reporte_mas_alquilados", {
    p_desde: addDaysISO(hasta, -dias),
    p_hasta: hasta,
    p_limite: 5,
  })
  if (error) throw error
  return data ?? []
}
