import { CATEGORIA_LABEL, ESTADO_DISFRAZ_LABEL } from "@/lib/constants"
import { formatCurrency, formatDate, formatNumber, todayISO } from "@/lib/format"
import {
  fetchReporteAtrasados,
  fetchReporteClientesFrecuentes,
  fetchReporteIngresos,
  fetchReporteInventario,
  fetchReporteMasAlquilados,
  resumirInventarioPorCategoria,
  totalizarIngresos,
  type Agrupacion,
  type RangoFechas,
  type ReportesClient,
} from "@/lib/queries/reportes"
import type {
  AlquilerVista,
  DisfrazVista,
  ReporteClientesFrecuentesFila,
  ReporteIngresosFila,
  ReporteMasAlquiladosFila,
} from "@/types/domain"

import { TITULO_REPORTE, type TablaReporte, type TipoReporte } from "./tipos"

export type ParametrosReporte = RangoFechas & { agrupacion: Agrupacion }

const PERIODO_HEADER: Record<Agrupacion, string> = { dia: "Día", semana: "Semana (desde)", mes: "Mes" }

function textoPeriodo({ desde, hasta }: RangoFechas): string {
  return `Período: ${formatDate(desde)} al ${formatDate(hasta)}`
}

function textoCorte(): string {
  return `Fecha de corte: ${formatDate(todayISO())}`
}

const suma = (valores: Array<number | string | null>) => valores.reduce<number>((acc, v) => acc + Number(v ?? 0), 0)

// -----------------------------------------------------------------------------
// Constructores puros (datos → tabla). Separados de las consultas para poder probarlos sin base.
// -----------------------------------------------------------------------------
export function tablaIngresos(filas: ReporteIngresosFila[], params: ParametrosReporte): TablaReporte {
  const totales = totalizarIngresos(filas)
  return {
    tipo: "ingresos",
    titulo: TITULO_REPORTE.ingresos,
    periodo: textoPeriodo(params),
    orientacion: "portrait",
    columnas: [
      { header: PERIODO_HEADER[params.agrupacion], formato: params.agrupacion === "mes" ? "mes" : "fecha", ancho: 18 },
      { header: "Total", formato: "moneda", ancho: 16 },
      { header: "Señas", formato: "moneda", ancho: 16 },
      { header: "Saldos", formato: "moneda", ancho: 16 },
      { header: "Cargos", formato: "moneda", ancho: 16 },
      { header: "Pagos", formato: "entero", ancho: 10 },
    ],
    filas: filas.map((f) => [f.periodo, f.total, f.senas, f.saldos, f.cargos, f.cantidad_pagos]),
    totales: ["Total", totales.total, totales.senas, totales.saldos, totales.cargos, totales.cantidad_pagos],
    resumen: [
      { label: "Ingresos del período", valor: formatCurrency(totales.total) },
      { label: "Pagos registrados", valor: formatNumber(totales.cantidad_pagos) },
    ],
  }
}

export function tablaMasAlquilados(filas: ReporteMasAlquiladosFila[], params: ParametrosReporte): TablaReporte {
  return {
    tipo: "mas-alquilados",
    titulo: TITULO_REPORTE["mas-alquilados"],
    periodo: textoPeriodo(params),
    orientacion: "portrait",
    columnas: [
      { header: "#", formato: "entero", ancho: 5 },
      { header: "Código", formato: "texto", ancho: 11 },
      { header: "Disfraz", formato: "texto", ancho: 30 },
      { header: "Categoría", formato: "texto", ancho: 14 },
      { header: "Talle", formato: "texto", ancho: 12 },
      { header: "Veces", formato: "entero", ancho: 8 },
      { header: "Unidades", formato: "entero", ancho: 10 },
      { header: "Ingresos", formato: "moneda", ancho: 15 },
    ],
    filas: filas.map((f, i) => [
      i + 1,
      f.codigo,
      f.nombre,
      CATEGORIA_LABEL[f.categoria],
      f.talle,
      f.veces_alquilado,
      f.unidades_alquiladas,
      f.ingresos,
    ]),
    totales: [
      null,
      "Total",
      null,
      null,
      null,
      suma(filas.map((f) => f.veces_alquilado)),
      suma(filas.map((f) => f.unidades_alquiladas)),
      suma(filas.map((f) => f.ingresos)),
    ],
  }
}

export function tablaClientesFrecuentes(filas: ReporteClientesFrecuentesFila[], params: ParametrosReporte): TablaReporte {
  return {
    tipo: "clientes-frecuentes",
    titulo: TITULO_REPORTE["clientes-frecuentes"],
    periodo: textoPeriodo(params),
    orientacion: "landscape",
    columnas: [
      { header: "Cliente", formato: "texto", ancho: 28 },
      { header: "DNI", formato: "texto", ancho: 12 },
      { header: "Teléfono", formato: "texto", ancho: 15 },
      { header: "Alquileres", formato: "entero", ancho: 11 },
      { header: "Facturado", formato: "moneda", ancho: 15 },
      { header: "Pagado", formato: "moneda", ancho: 15 },
      { header: "Saldo", formato: "moneda", ancho: 15 },
      { header: "Último alquiler", formato: "fecha", ancho: 14 },
    ],
    filas: filas.map((f) => [
      f.nombre_completo,
      f.dni,
      f.telefono,
      f.cantidad_alquileres,
      f.total_facturado,
      f.total_pagado,
      Number(f.total_facturado) - Number(f.total_pagado),
      f.ultimo_alquiler,
    ]),
    totales: [
      "Total",
      null,
      null,
      suma(filas.map((f) => f.cantidad_alquileres)),
      suma(filas.map((f) => f.total_facturado)),
      suma(filas.map((f) => f.total_pagado)),
      suma(filas.map((f) => Number(f.total_facturado) - Number(f.total_pagado))),
      null,
    ],
  }
}

export function tablaInventario(disfraces: DisfrazVista[]): TablaReporte {
  const categorias = resumirInventarioPorCategoria(disfraces)
  const valorReposicion = suma(categorias.map((c) => c.valor_reposicion))
  return {
    tipo: "inventario",
    titulo: TITULO_REPORTE.inventario,
    periodo: textoCorte(),
    orientacion: "landscape",
    columnas: [
      { header: "Código", formato: "texto", ancho: 11 },
      { header: "Disfraz", formato: "texto", ancho: 28 },
      { header: "Categoría", formato: "texto", ancho: 13 },
      { header: "Talle", formato: "texto", ancho: 12 },
      { header: "Estado", formato: "texto", ancho: 13 },
      { header: "Total", formato: "entero", ancho: 7 },
      { header: "Disp.", formato: "entero", ancho: 7 },
      { header: "Alq.", formato: "entero", ancho: 7 },
      { header: "Mant.", formato: "entero", ancho: 7 },
      { header: "Extr.", formato: "entero", ancho: 7 },
      { header: "Precio alquiler", formato: "moneda", ancho: 14 },
      { header: "Valor reposición", formato: "moneda", ancho: 15 },
    ],
    filas: disfraces.map((d) => [
      d.codigo,
      d.nombre,
      CATEGORIA_LABEL[d.categoria],
      d.talle,
      ESTADO_DISFRAZ_LABEL[d.estado_efectivo],
      d.cantidad_total,
      d.cantidad_disponible,
      d.cantidad_alquilada,
      d.cantidad_mantenimiento,
      d.cantidad_extraviada,
      d.precio_alquiler,
      d.cantidad_total * Number(d.precio_reposicion),
    ]),
    totales: [
      "Total",
      null,
      null,
      null,
      null,
      suma(disfraces.map((d) => d.cantidad_total)),
      suma(disfraces.map((d) => d.cantidad_disponible)),
      suma(disfraces.map((d) => d.cantidad_alquilada)),
      suma(disfraces.map((d) => d.cantidad_mantenimiento)),
      suma(disfraces.map((d) => d.cantidad_extraviada)),
      null,
      valorReposicion,
    ],
    resumen: [
      { label: "Modelos", valor: formatNumber(disfraces.length) },
      { label: "Unidades", valor: formatNumber(suma(disfraces.map((d) => d.cantidad_total))) },
      { label: "Valor de reposición", valor: formatCurrency(valorReposicion) },
    ],
  }
}

export function tablaAtrasados(alquileres: AlquilerVista[]): TablaReporte {
  return {
    tipo: "atrasados",
    titulo: TITULO_REPORTE.atrasados,
    periodo: textoCorte(),
    orientacion: "landscape",
    columnas: [
      { header: "Cliente", formato: "texto", ancho: 26 },
      { header: "DNI", formato: "texto", ancho: 12 },
      { header: "Teléfono", formato: "texto", ancho: 15 },
      { header: "Alquilado", formato: "fecha", ancho: 12 },
      { header: "Debía devolver", formato: "fecha", ancho: 14 },
      { header: "Días de atraso", formato: "entero", ancho: 13 },
      { header: "Disfraces", formato: "texto", ancho: 40 },
      { header: "Saldo", formato: "moneda", ancho: 14 },
    ],
    filas: alquileres.map((a) => [
      a.cliente_nombre_completo,
      a.cliente_dni,
      a.cliente_telefono,
      a.fecha_alquiler,
      a.fecha_devolucion,
      a.dias_atraso,
      a.resumen_items,
      a.saldo_pendiente,
    ]),
    totales: ["Total", null, null, null, null, null, `${alquileres.length} alquiler(es)`, suma(alquileres.map((a) => a.saldo_pendiente))],
  }
}

/** Consulta los datos (con el cliente recibido, respetando RLS) y arma la tabla del reporte. */
export async function construirReporte(
  tipo: TipoReporte,
  supabase: ReportesClient,
  params: ParametrosReporte
): Promise<TablaReporte> {
  switch (tipo) {
    case "ingresos":
      return tablaIngresos(await fetchReporteIngresos(supabase, params), params)
    case "mas-alquilados":
      return tablaMasAlquilados(await fetchReporteMasAlquilados(supabase, params), params)
    case "clientes-frecuentes":
      return tablaClientesFrecuentes(await fetchReporteClientesFrecuentes(supabase, params), params)
    case "inventario":
      return tablaInventario(await fetchReporteInventario(supabase))
    case "atrasados":
      return tablaAtrasados(await fetchReporteAtrasados(supabase))
  }
}
