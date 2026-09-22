import type { BrowserSupabaseClient } from "@/lib/supabase/client"
import type { Alerta, SeveridadAlerta } from "@/types/domain"

const SEVERIDAD_ORDEN: Record<SeveridadAlerta, number> = { alta: 0, media: 1, baja: 2 }

/** Alertas calculadas en la base (v_alertas), ordenadas por severidad y fecha. */
export async function fetchAlertas(supabase: BrowserSupabaseClient): Promise<Alerta[]> {
  const { data, error } = await supabase.from("v_alertas").select("*").limit(500)
  if (error) throw error
  return ((data ?? []) as Alerta[]).sort(
    (a, b) =>
      SEVERIDAD_ORDEN[a.severidad] - SEVERIDAD_ORDEN[b.severidad] ||
      (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999") ||
      a.titulo.localeCompare(b.titulo)
  )
}

/** Ruta del detalle al que apunta una alerta. */
export function alertaHref(alerta: Pick<Alerta, "referencia_tipo" | "referencia_id">): string {
  switch (alerta.referencia_tipo) {
    case "alquiler":
      return `/dashboard/alquileres/${alerta.referencia_id}`
    case "reserva":
      return `/dashboard/reservas/${alerta.referencia_id}`
    case "disfraz":
      return `/dashboard/inventario/${alerta.referencia_id}`
  }
}
