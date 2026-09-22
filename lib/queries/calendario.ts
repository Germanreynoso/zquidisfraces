import { todayISO } from "@/lib/format"
import type { BrowserSupabaseClient } from "@/lib/supabase/client"

export type TipoEvento = "alquiler" | "reserva" | "devolucion"

export type EventoCalendario = {
  id: string
  tipo: TipoEvento
  titulo: string
  cliente: string
  resumen: string | null
  /** YYYY-MM-DD, inclusive. */
  inicio: string
  /** YYYY-MM-DD, inclusive. */
  fin: string
  href: string
  atrasado: boolean
  pendiente: boolean
}

/**
 * Eventos del calendario para el rango visible [desde, hasta) (hasta exclusivo, como lo entrega FullCalendar):
 * alquileres activos, devoluciones programadas de esos alquileres y reservas vigentes.
 * Los alquileres atrasados se extienden hasta hoy (siguen fuera del local).
 */
export async function fetchEventosCalendario(
  supabase: BrowserSupabaseClient,
  desde: string,
  hasta: string
): Promise<EventoCalendario[]> {
  const hoy = todayISO()

  const [alquileres, reservas] = await Promise.all([
    supabase
      .from("v_alquileres")
      .select("id, cliente_nombre_completo, resumen_items, fecha_alquiler, fecha_devolucion")
      .eq("estado", "activo")
      .lt("fecha_alquiler", hasta)
      // Un alquiler atrasado sigue ocupando el disfraz hasta hoy aunque su vencimiento haya quedado atrás.
      .or(`fecha_devolucion.gte.${desde},fecha_devolucion.lt.${hoy}`)
      .order("fecha_alquiler")
      .limit(1000),
    supabase
      .from("v_reservas")
      .select("id, cliente_nombre_completo, resumen_items, fecha_inicio, fecha_fin, estado")
      .in("estado", ["pendiente", "confirmada"])
      .lt("fecha_inicio", hasta)
      .gte("fecha_fin", desde)
      .order("fecha_inicio")
      .limit(1000),
  ])
  if (alquileres.error) throw alquileres.error
  if (reservas.error) throw reservas.error

  const eventos: EventoCalendario[] = []

  for (const a of alquileres.data ?? []) {
    if (!a.id || !a.fecha_alquiler || !a.fecha_devolucion) continue
    const cliente = a.cliente_nombre_completo ?? "Cliente"
    const atrasado = a.fecha_devolucion < hoy
    const href = `/dashboard/alquileres/${a.id}`
    eventos.push({
      id: `alquiler-${a.id}`,
      tipo: "alquiler",
      titulo: cliente,
      cliente,
      resumen: a.resumen_items,
      inicio: a.fecha_alquiler,
      fin: atrasado ? hoy : a.fecha_devolucion,
      href,
      atrasado,
      pendiente: false,
    })
    eventos.push({
      id: `devolucion-${a.id}`,
      tipo: "devolucion",
      titulo: `Devuelve: ${cliente}`,
      cliente,
      resumen: a.resumen_items,
      inicio: a.fecha_devolucion,
      fin: a.fecha_devolucion,
      href,
      atrasado,
      pendiente: false,
    })
  }

  for (const r of reservas.data ?? []) {
    if (!r.id || !r.fecha_inicio || !r.fecha_fin) continue
    const cliente = r.cliente_nombre_completo ?? "Cliente"
    eventos.push({
      id: `reserva-${r.id}`,
      tipo: "reserva",
      titulo: cliente,
      cliente,
      resumen: r.resumen_items,
      inicio: r.fecha_inicio,
      fin: r.fecha_fin,
      href: `/dashboard/reservas/${r.id}`,
      atrasado: false,
      pendiente: r.estado === "pendiente",
    })
  }

  return eventos
}
