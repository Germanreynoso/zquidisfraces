import { formatCurrency, formatDate, todayISO } from "@/lib/format"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"

/**
 * Resumen diario del negocio que se envía a Telegram.
 * El armado del texto es una función pura (se testea sin base ni red).
 */

export type FilaVencida = {
  cliente: string
  telefono: string | null
  dias_atraso: number
  items: string | null
  saldo: number
}

export type FilaProxima = { cliente: string; fecha: string; items: string | null }
export type FilaRetiro = { cliente: string; hasta: string; items: string | null; estado: string }
export type FilaStock = { nombre: string; talle: string; disponibles: number; minimo: number; extraviadas: number }

export type DatosResumen = {
  hoy: string
  vencidas: FilaVencida[]
  proximas: FilaProxima[]
  retiros: FilaRetiro[]
  stock: FilaStock[]
}

const MAX_POR_BLOQUE = 8

/** Telegram interpreta HTML: hay que escapar estos tres caracteres. */
function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function bloque(titulo: string, filas: string[], total: number): string[] {
  if (total === 0) return []
  const lineas = [titulo, ...filas.slice(0, MAX_POR_BLOQUE).map((f) => `• ${f}`)]
  if (total > MAX_POR_BLOQUE) lineas.push(`• …y ${total - MAX_POR_BLOQUE} más`)
  return [...lineas, ""]
}

export function construirResumen(datos: DatosResumen): string {
  const { hoy, vencidas, proximas, retiros, stock } = datos
  const partes: string[] = [`🎭 <b>ZiquiDisfraces</b> · ${escapar(formatDate(hoy, "EEEE d 'de' MMMM"))}`, ""]

  partes.push(
    ...bloque(
      `⚠️ <b>Devoluciones vencidas (${vencidas.length})</b>`,
      vencidas.map((v) => {
        const atraso = v.dias_atraso === 1 ? "1 día" : `${v.dias_atraso} días`
        const saldo = v.saldo > 0 ? ` · debe ${formatCurrency(v.saldo)}` : ""
        const tel = v.telefono ? ` · ${escapar(v.telefono)}` : ""
        return `<b>${escapar(v.cliente)}</b> — ${atraso} — ${escapar(v.items ?? "sin detalle")}${saldo}${tel}`
      }),
      vencidas.length
    )
  )

  partes.push(
    ...bloque(
      `📅 <b>Vencen hoy y mañana (${proximas.length})</b>`,
      proximas.map(
        (p) => `${escapar(p.cliente)} — ${formatDate(p.fecha, "dd/MM")} — ${escapar(p.items ?? "sin detalle")}`
      ),
      proximas.length
    )
  )

  partes.push(
    ...bloque(
      `🛎️ <b>Retiros de reservas de hoy (${retiros.length})</b>`,
      retiros.map(
        (r) =>
          `${escapar(r.cliente)} — hasta ${formatDate(r.hasta, "dd/MM")} — ${escapar(r.items ?? "sin detalle")}` +
          (r.estado === "pendiente" ? " (sin confirmar)" : "")
      ),
      retiros.length
    )
  )

  partes.push(
    ...bloque(
      `📦 <b>Stock para revisar (${stock.length})</b>`,
      stock.map((s) => {
        const detalle = s.extraviadas > 0 ? `${s.extraviadas} extraviada(s)` : `${s.disponibles} de mínimo ${s.minimo}`
        return `${escapar(s.nombre)} (${escapar(s.talle)}) — ${detalle}`
      }),
      stock.length
    )
  )

  if (partes.length === 2) partes.push("✅ Sin pendientes: no hay atrasos, vencimientos de hoy ni faltantes.", "")

  return partes.join("\n").trim()
}

/** Lee los datos del resumen. Requiere un cliente con permisos de lectura sobre todas las tablas. */
export async function obtenerDatosResumen(supabase: SupabaseClient<Database>): Promise<DatosResumen> {
  const hoy = todayISO()
  const manana = new Date(`${hoy}T12:00:00Z`)
  manana.setDate(manana.getDate() + 1)
  const hastaManana = manana.toISOString().slice(0, 10)

  const [alquileres, reservas, disfraces] = await Promise.all([
    supabase
      .from("v_alquileres")
      .select("cliente_nombre_completo, cliente_telefono, fecha_devolucion, dias_atraso, saldo_pendiente, resumen_items")
      .eq("estado", "activo")
      .lte("fecha_devolucion", hastaManana)
      .order("fecha_devolucion"),
    supabase
      .from("v_reservas")
      .select("cliente_nombre_completo, fecha_fin, estado, resumen_items")
      .in("estado", ["pendiente", "confirmada"])
      .eq("fecha_inicio", hoy),
    supabase
      .from("v_disfraces")
      .select("nombre, talle, cantidad_disponible, cantidad_extraviada, stock_minimo, stock_bajo")
      .eq("activo", true)
      .or("stock_bajo.eq.true,cantidad_extraviada.gt.0")
      .order("nombre"),
  ])

  if (alquileres.error) throw alquileres.error
  if (reservas.error) throw reservas.error
  if (disfraces.error) throw disfraces.error

  const activos = alquileres.data ?? []

  return {
    hoy,
    vencidas: activos
      .filter((a) => (a.fecha_devolucion ?? hoy) < hoy)
      .map((a) => ({
        cliente: a.cliente_nombre_completo ?? "Cliente",
        telefono: a.cliente_telefono,
        dias_atraso: a.dias_atraso ?? 0,
        items: a.resumen_items,
        saldo: Number(a.saldo_pendiente ?? 0),
      })),
    proximas: activos
      .filter((a) => (a.fecha_devolucion ?? "") >= hoy)
      .map((a) => ({
        cliente: a.cliente_nombre_completo ?? "Cliente",
        fecha: a.fecha_devolucion ?? hoy,
        items: a.resumen_items,
      })),
    retiros: (reservas.data ?? []).map((r) => ({
      cliente: r.cliente_nombre_completo ?? "Cliente",
      hasta: r.fecha_fin ?? hoy,
      items: r.resumen_items,
      estado: r.estado ?? "pendiente",
    })),
    stock: (disfraces.data ?? []).map((d) => ({
      nombre: d.nombre ?? "",
      talle: d.talle ?? "",
      disponibles: d.cantidad_disponible ?? 0,
      minimo: d.stock_minimo ?? 0,
      extraviadas: d.cantidad_extraviada ?? 0,
    })),
  }
}
