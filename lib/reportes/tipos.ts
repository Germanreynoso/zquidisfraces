import { formatCurrency, formatDate, formatNumber } from "@/lib/format"

/** Contrato común de los reportes exportables: lo arman los constructores y lo consumen PDF y Excel. */

export const TIPOS_REPORTE = ["ingresos", "mas-alquilados", "clientes-frecuentes", "inventario", "atrasados"] as const
export type TipoReporte = (typeof TIPOS_REPORTE)[number]

export const FORMATOS_EXPORTACION = ["pdf", "xlsx"] as const
export type FormatoExportacion = (typeof FORMATOS_EXPORTACION)[number]

export const TITULO_REPORTE: Record<TipoReporte, string> = {
  ingresos: "Ingresos por período",
  "mas-alquilados": "Disfraces más alquilados",
  "clientes-frecuentes": "Clientes frecuentes",
  inventario: "Inventario actual",
  atrasados: "Alquileres atrasados",
}

/** Reportes que son una foto del momento (no dependen del período elegido). */
export const REPORTES_SIN_PERIODO: readonly TipoReporte[] = ["inventario", "atrasados"]

export type FormatoColumna = "texto" | "moneda" | "entero" | "fecha" | "mes"

export type Celda = string | number | null

export type ColumnaReporte = {
  header: string
  formato: FormatoColumna
  /** Ancho aproximado en caracteres (Excel) y peso relativo (PDF). */
  ancho: number
}

export type TablaReporte = {
  tipo: TipoReporte
  titulo: string
  /** Rótulo completo del período ("Período: …") o de la fecha de corte ("Fecha de corte: …"). */
  periodo: string
  columnas: ColumnaReporte[]
  filas: Celda[][]
  totales?: Celda[]
  resumen?: { label: string; valor: string }[]
  orientacion: "portrait" | "landscape"
}

export const MIME_TYPE: Record<FormatoExportacion, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

export function nombreArchivo(tipo: TipoReporte, desde: string, hasta: string, formato: FormatoExportacion): string {
  return `reporte-${tipo}-${desde}_${hasta}.${formato}`
}

export function esNumerico(formato: FormatoColumna): boolean {
  return formato === "moneda" || formato === "entero"
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Representación de texto de una celda (PDF y tablas). */
export function formatearCelda(valor: Celda, formato: FormatoColumna): string {
  if (valor === null || valor === "") return "—"
  switch (formato) {
    case "moneda":
      return formatCurrency(Number(valor))
    case "entero":
      return formatNumber(Number(valor))
    case "fecha":
      return formatDate(String(valor))
    case "mes":
      return capitalizar(formatDate(String(valor), "MMMM yyyy"))
    default:
      return String(valor)
  }
}
