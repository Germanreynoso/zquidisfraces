import "server-only"

import { addDaysISO, todayISO } from "@/lib/format"
import type { ServerSupabaseClient } from "@/lib/supabase/server"

export { normalizarArgumentos } from "./argumentos"

/**
 * Herramientas de SOLO LECTURA que el asistente puede ejecutar.
 * Todas usan el cliente de Supabase del usuario: las políticas RLS deciden qué puede ver.
 * Los resultados se recortan (límite de filas y campos) para no inflar el contexto del modelo.
 */

export type DefinicionHerramienta = {
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

type Ejecutor = (supabase: ServerSupabaseClient, args: Record<string, unknown>) => Promise<unknown>

const LIMITE = 25

// Los modelos mandan null en los parámetros que no usan y el validador de Groq
// rechaza la llamada si el esquema no lo contempla.
const OPCIONAL_TEXTO = ["string", "null"]
const OPCIONAL_BOOLEANO = ["boolean", "null"]
const OPCIONAL_NUMERO = ["number", "null"]

const texto = (valor: unknown): string | undefined => {
  const v = typeof valor === "string" ? valor.trim() : ""
  return v.length > 0 ? v.slice(0, 80) : undefined
}

const fecha = (valor: unknown, porDefecto: string): string =>
  typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : porDefecto

const lista = (valor: unknown): string[] | undefined => {
  if (typeof valor === "string" && valor.trim()) return [valor.trim()]
  if (Array.isArray(valor)) {
    const items = valor.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    return items.length ? items : undefined
  }
  return undefined
}

/** `or()` de PostgREST con el texto saneado (los filtros usan * como comodín). */
function buscar(columnas: string[], termino: string): string {
  const limpio = termino.replace(/[%_,()"\\*]/g, " ").replace(/\s+/g, " ").trim()
  return columnas.map((c) => `${c}.ilike.*${limpio}*`).join(",")
}

function error(mensaje: string) {
  return { error: mensaje }
}

// -----------------------------------------------------------------------------
// Definiciones que ve el modelo
// -----------------------------------------------------------------------------
export const HERRAMIENTAS: DefinicionHerramienta[] = [
  {
    type: "function",
    function: {
      name: "resumen_negocio",
      description:
        "Estado general del negocio ahora mismo: unidades totales, disponibles, alquiladas, en mantenimiento y extraviadas; alquileres activos, atrasados y próximos a devolver; reservas próximas; ingresos del mes y saldo por cobrar.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_disfraces",
      description:
        "Busca disfraces del catálogo y devuelve su stock por estado, precios y si tienen stock bajo. Sin filtros devuelve los primeros del catálogo.",
      parameters: {
        type: "object",
        properties: {
          texto: { type: OPCIONAL_TEXTO, description: "Nombre, código o talle a buscar. Ej.: 'batman', 'SH-001'." },
          categoria: {
            type: OPCIONAL_TEXTO,
            enum: [
              null,
              "superheroes",
              "princesas",
              "terror",
              "animales",
              "historicos",
              "profesiones",
              "infantiles",
              "adultos",
              "otros",
            ],
          },
          estado: {
            type: OPCIONAL_TEXTO,
            enum: [null, "disponible", "alquilado", "reservado", "mantenimiento", "extraviado"],
            description: "Estado efectivo del disfraz.",
          },
          solo_stock_bajo: { type: OPCIONAL_BOOLEANO, description: "Solo los que están por debajo del stock mínimo." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "disponibilidad",
      description:
        "Unidades disponibles de cada disfraz para un rango de fechas, contemplando alquileres activos y reservas. Sirve para responder '¿puedo alquilar X del día A al B?'.",
      parameters: {
        type: "object",
        properties: {
          desde: { type: "string", description: "Fecha de inicio en formato YYYY-MM-DD." },
          hasta: { type: "string", description: "Fecha de fin en formato YYYY-MM-DD." },
          texto: { type: OPCIONAL_TEXTO, description: "Filtra por nombre, código o talle del disfraz." },
        },
        required: ["desde", "hasta"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_clientes",
      description:
        "Busca clientes por nombre, apellido, DNI o teléfono. Devuelve cuántos alquileres tienen, cuántos están activos o vencidos y el saldo que deben.",
      parameters: {
        type: "object",
        properties: { texto: { type: OPCIONAL_TEXTO, description: "Nombre, apellido, DNI o teléfono." } },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_alquileres",
      description:
        "Lista alquileres con su estado (activo, atrasado, devuelto, cancelado), fechas, disfraces, montos y saldo. Para ver atrasados usar estado='atrasado'.",
      parameters: {
        type: "object",
        properties: {
          estado: { type: OPCIONAL_TEXTO, enum: [null, "activo", "atrasado", "devuelto", "cancelado"] },
          texto: { type: OPCIONAL_TEXTO, description: "Cliente, DNI o disfraz." },
          vence_hasta: {
            type: OPCIONAL_TEXTO,
            description: "Solo alquileres activos que vencen hasta esta fecha (YYYY-MM-DD).",
          },
          con_saldo: { type: OPCIONAL_BOOLEANO, description: "Solo los que tienen saldo pendiente." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detalle_alquiler",
      description:
        "Detalle completo de un alquiler: disfraces con cantidades y precios, pagos registrados y devolución si ya volvió. Requiere el id que devuelven las otras herramientas.",
      parameters: {
        type: "object",
        properties: { id: { type: "string", description: "Identificador del alquiler." } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_reservas",
      description: "Lista reservas con su cliente, período, estado y disfraces reservados.",
      parameters: {
        type: "object",
        properties: {
          estado: { type: OPCIONAL_TEXTO, enum: [null, "pendiente", "confirmada", "cancelada", "convertida"] },
          desde: { type: OPCIONAL_TEXTO, description: "Reservas que empiezan desde esta fecha (YYYY-MM-DD)." },
          hasta: { type: OPCIONAL_TEXTO, description: "Reservas que empiezan hasta esta fecha (YYYY-MM-DD)." },
          texto: { type: OPCIONAL_TEXTO, description: "Cliente, DNI o disfraz." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "alertas",
      description:
        "Alertas activas del sistema: devoluciones vencidas, devoluciones de hoy o mañana, stock bajo, extraviados y reservas próximas.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "ingresos",
      description: "Dinero cobrado en un período (señas, saldos y cargos), agrupado por día, semana o mes.",
      parameters: {
        type: "object",
        properties: {
          desde: { type: OPCIONAL_TEXTO, description: "YYYY-MM-DD. Por defecto, hace 30 días." },
          hasta: { type: OPCIONAL_TEXTO, description: "YYYY-MM-DD. Por defecto, hoy." },
          agrupacion: { type: OPCIONAL_TEXTO, enum: [null, "dia", "semana", "mes"] },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mas_alquilados",
      description: "Ranking de disfraces más alquilados en un período, con unidades e ingresos.",
      parameters: {
        type: "object",
        properties: {
          desde: { type: OPCIONAL_TEXTO, description: "YYYY-MM-DD. Por defecto, hace 90 días." },
          hasta: { type: OPCIONAL_TEXTO, description: "YYYY-MM-DD. Por defecto, hoy." },
          limite: { type: OPCIONAL_NUMERO, description: "Cantidad de disfraces a devolver (máximo 20)." },
        },
        required: [],
      },
    },
  },
]

// -----------------------------------------------------------------------------
// Ejecutores
// -----------------------------------------------------------------------------
const EJECUTORES: Record<string, Ejecutor> = {
  async resumen_negocio(supabase) {
    const { data, error: e } = await supabase.rpc("dashboard_resumen")
    if (e) throw e
    return { hoy: todayISO(), ...(data as object) }
  },

  async buscar_disfraces(supabase, args) {
    let query = supabase
      .from("v_disfraces")
      .select(
        "id, codigo, nombre, categoria, talle, cantidad_total, cantidad_disponible, cantidad_alquilada, cantidad_mantenimiento, cantidad_extraviada, estado_efectivo, stock_bajo, stock_minimo, precio_alquiler, precio_reposicion"
      )
      .eq("activo", true)

    const t = texto(args.texto)
    if (t) query = query.or(buscar(["nombre", "codigo", "talle"], t))
    const categorias = lista(args.categoria)
    if (categorias) query = query.in("categoria", categorias as never[])
    const estados = lista(args.estado)
    if (estados) query = query.in("estado_efectivo", estados as never[])
    if (args.solo_stock_bajo === true) query = query.eq("stock_bajo", true)

    const { data, error: e } = await query.order("nombre").limit(LIMITE)
    if (e) throw e
    return { cantidad: data?.length ?? 0, disfraces: data ?? [] }
  },

  async disponibilidad(supabase, args) {
    const desde = fecha(args.desde, todayISO())
    const hasta = fecha(args.hasta, desde)
    if (hasta < desde) return error("El rango de fechas es inválido: 'hasta' es anterior a 'desde'.")

    const [disponibilidad, disfraces] = await Promise.all([
      supabase.rpc("disponibilidad_rango", { p_inicio: desde, p_fin: hasta }),
      (() => {
        let q = supabase.from("v_disfraces").select("id, codigo, nombre, talle, precio_alquiler").eq("activo", true)
        const t = texto(args.texto)
        if (t) q = q.or(buscar(["nombre", "codigo", "talle"], t))
        return q.order("nombre").limit(LIMITE)
      })(),
    ])
    if (disponibilidad.error) throw disponibilidad.error
    if (disfraces.error) throw disfraces.error

    const porId = new Map((disponibilidad.data ?? []).map((d) => [d.disfraz_id, d.disponible]))
    return {
      periodo: { desde, hasta },
      disfraces: (disfraces.data ?? []).map((d) => ({
        ...d,
        // Las columnas de vistas llegan tipadas como opcionales: el id siempre viene.
        disponibles_en_el_periodo: Math.max(porId.get(d.id ?? "") ?? 0, 0),
      })),
    }
  },

  async buscar_clientes(supabase, args) {
    let query = supabase
      .from("v_clientes")
      .select(
        "id, nombre_completo, dni, telefono, email, activo, total_alquileres, alquileres_activos, alquileres_vencidos, saldo_pendiente_total, ultimo_alquiler"
      )
    const t = texto(args.texto)
    if (t) query = query.or(buscar(["nombre", "apellido", "nombre_completo", "dni", "telefono"], t))
    const { data, error: e } = await query.order("apellido").limit(15)
    if (e) throw e
    return { cantidad: data?.length ?? 0, clientes: data ?? [] }
  },

  async buscar_alquileres(supabase, args) {
    let query = supabase
      .from("v_alquileres")
      .select(
        "id, cliente_nombre_completo, cliente_dni, cliente_telefono, fecha_alquiler, fecha_devolucion, fecha_devolucion_real, estado_efectivo, dias_atraso, monto_total, cargos_adicionales, monto_pagado, saldo_pendiente, resumen_items"
      )

    const estados = lista(args.estado)
    if (estados) query = query.in("estado_efectivo", estados as never[])
    const t = texto(args.texto)
    if (t) query = query.or(buscar(["cliente_nombre_completo", "cliente_dni", "resumen_items"], t))
    const vence = texto(args.vence_hasta)
    if (vence && /^\d{4}-\d{2}-\d{2}$/.test(vence)) {
      query = query.eq("estado", "activo").lte("fecha_devolucion", vence)
    }
    if (args.con_saldo === true) query = query.gt("saldo_pendiente", 0)

    const { data, error: e } = await query.order("fecha_devolucion").limit(LIMITE)
    if (e) throw e
    return { cantidad: data?.length ?? 0, alquileres: data ?? [] }
  },

  async detalle_alquiler(supabase, args) {
    const id = texto(args.id)
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return error("Se necesita el id del alquiler.")

    const [alquiler, items, pagos, devolucion] = await Promise.all([
      supabase.from("v_alquileres").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("alquiler_items")
        .select("cantidad, precio_unitario, subtotal, disfraces(codigo, nombre, talle)")
        .eq("alquiler_id", id),
      supabase.from("pagos").select("fecha, monto, tipo, metodo, observaciones").eq("alquiler_id", id).order("fecha"),
      supabase
        .from("v_devoluciones")
        .select("fecha_devolucion_real, estado_disfraz, costo_reparacion, costo_reposicion, unidades_danadas, unidades_faltantes, observaciones")
        .eq("alquiler_id", id)
        .maybeSingle(),
    ])
    if (alquiler.error) throw alquiler.error
    if (!alquiler.data) return error("No existe un alquiler con ese id.")

    return {
      alquiler: alquiler.data,
      items: items.data ?? [],
      pagos: pagos.data ?? [],
      devolucion: devolucion.data ?? null,
    }
  },

  async buscar_reservas(supabase, args) {
    let query = supabase
      .from("v_reservas")
      .select(
        "id, cliente_nombre_completo, cliente_dni, cliente_telefono, fecha_inicio, fecha_fin, estado, resumen_items, alquiler_id"
      )
    const estados = lista(args.estado)
    if (estados) query = query.in("estado", estados as never[])
    const desde = texto(args.desde)
    if (desde && /^\d{4}-\d{2}-\d{2}$/.test(desde)) query = query.gte("fecha_inicio", desde)
    const hasta = texto(args.hasta)
    if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) query = query.lte("fecha_inicio", hasta)
    const t = texto(args.texto)
    if (t) query = query.or(buscar(["cliente_nombre_completo", "cliente_dni", "resumen_items"], t))

    const { data, error: e } = await query.order("fecha_inicio").limit(LIMITE)
    if (e) throw e
    return { cantidad: data?.length ?? 0, reservas: data ?? [] }
  },

  async alertas(supabase) {
    const { data, error: e } = await supabase
      .from("v_alertas")
      .select("tipo, severidad, titulo, descripcion, fecha, referencia_tipo, referencia_id")
      .limit(50)
    if (e) throw e
    return { cantidad: data?.length ?? 0, alertas: data ?? [] }
  },

  async ingresos(supabase, args) {
    const hasta = fecha(args.hasta, todayISO())
    const desde = fecha(args.desde, addDaysISO(hasta, -29))
    const agrupacionArg = typeof args.agrupacion === "string" ? args.agrupacion : "dia"
    const agrupacion = ["dia", "semana", "mes"].includes(agrupacionArg) ? agrupacionArg : "dia"
    if (hasta < desde) return error("El rango de fechas es inválido.")

    const { data, error: e } = await supabase.rpc("reporte_ingresos", {
      p_desde: desde,
      p_hasta: hasta,
      p_agrupacion: agrupacion,
    })
    if (e) throw e
    const filas = data ?? []
    const total = filas.reduce((suma, f) => suma + Number(f.total), 0)
    return {
      periodo: { desde, hasta, agrupacion },
      total_cobrado: total,
      // Se envían solo los períodos con movimiento para no gastar contexto.
      detalle: filas.filter((f) => Number(f.total) > 0).slice(-40),
    }
  },

  async mas_alquilados(supabase, args) {
    const hasta = fecha(args.hasta, todayISO())
    const desde = fecha(args.desde, addDaysISO(hasta, -90))
    const limite = Math.min(Math.max(Number(args.limite) || 10, 1), 20)
    const { data, error: e } = await supabase.rpc("reporte_mas_alquilados", {
      p_desde: desde,
      p_hasta: hasta,
      p_limite: limite,
    })
    if (e) throw e
    return { periodo: { desde, hasta }, ranking: data ?? [] }
  },
}

export async function ejecutarHerramienta(
  supabase: ServerSupabaseClient,
  nombre: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const ejecutor = EJECUTORES[nombre]
  if (!ejecutor) return error(`La herramienta "${nombre}" no existe.`)
  try {
    return await ejecutor(supabase, args)
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Error desconocido"
    return error(`No se pudo consultar la base: ${mensaje}`)
  }
}
