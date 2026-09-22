import { jsPDF } from "jspdf"
import { autoTable, type RowInput } from "jspdf-autotable"

import { APP_NAME } from "@/lib/constants"
import { formatDateTime } from "@/lib/format"

import { esNumerico, formatearCelda, type TablaReporte } from "./tipos"

type RGB = [number, number, number]

const COLOR_PRIMARIO: RGB = [103, 58, 200]
const COLOR_TEXTO: RGB = [30, 27, 46]
const COLOR_SECUNDARIO: RGB = [110, 106, 128]
const COLOR_FILA_ALTERNA: RGB = [248, 246, 253]
const COLOR_PIE: RGB = [238, 234, 250]
const MARGEN = 14

/**
 * Las fuentes estándar de PDF (Helvetica) solo cubren Latin-1: se normalizan espacios especiales
 * (los que usa Intl en montos) y se reemplazan símbolos fuera de rango para no imprimir basura.
 */
function textoPdf(valor: string): string {
  return valor
    .replace(/[\u00a0\u202f\u2009]/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[^\u0000-\u00ff]/g, "?")
}

/** Genera el PDF del reporte (A4, encabezado, tabla paginada con totales y numeración). */
export function generarPdf(tabla: TablaReporte, emitido: Date = new Date()): ArrayBuffer {
  const doc = new jsPDF({ orientation: tabla.orientacion, unit: "mm", format: "a4", compress: true })
  const anchoPagina = doc.internal.pageSize.getWidth()
  const altoPagina = doc.internal.pageSize.getHeight()

  doc.setProperties({ title: `${tabla.titulo} - ${APP_NAME}`, creator: APP_NAME })

  // Encabezado
  doc.setFillColor(...COLOR_PRIMARIO)
  doc.rect(0, 0, anchoPagina, 3, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(...COLOR_PRIMARIO)
  doc.text(APP_NAME.toUpperCase(), MARGEN, 12)
  doc.setFontSize(16)
  doc.setTextColor(...COLOR_TEXTO)
  doc.text(textoPdf(tabla.titulo), MARGEN, 20)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...COLOR_SECUNDARIO)
  doc.text(textoPdf(`${tabla.periodo}   ·   Emitido: ${formatDateTime(emitido)}`), MARGEN, 26)

  let y = 32
  if (tabla.resumen?.length) {
    const texto = tabla.resumen.map((r) => `${r.label}: ${r.valor}`).join("     ")
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COLOR_TEXTO)
    doc.text(textoPdf(texto), MARGEN, y)
    y += 5
  }

  const pesoTotal = tabla.columnas.reduce((acc, c) => acc + c.ancho, 0)
  const anchoUtil = anchoPagina - MARGEN * 2
  const columnStyles = Object.fromEntries(
    tabla.columnas.map((columna, index) => [
      index,
      {
        halign: esNumerico(columna.formato) ? ("right" as const) : ("left" as const),
        cellWidth: (columna.ancho / pesoTotal) * anchoUtil,
      },
    ])
  )

  const body: RowInput[] = tabla.filas.map((fila) =>
    fila.map((celda, index) => textoPdf(formatearCelda(celda, tabla.columnas[index].formato)))
  )
  const foot: RowInput[] | undefined = tabla.totales
    ? [
        tabla.totales.map((celda, index) =>
          celda === null ? "" : textoPdf(typeof celda === "string" ? celda : formatearCelda(celda, tabla.columnas[index].formato))
        ),
      ]
    : undefined

  autoTable(doc, {
    startY: y + 1,
    head: [tabla.columnas.map((c) => textoPdf(c.header))],
    body: body.length ? body : [[{ content: "Sin datos para el período elegido.", colSpan: tabla.columnas.length }]],
    foot: body.length ? foot : undefined,
    showHead: "everyPage",
    showFoot: "lastPage",
    theme: "plain",
    margin: { left: MARGEN, right: MARGEN, bottom: 16, top: 14 },
    styles: { font: "helvetica", fontSize: 8, cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 }, textColor: COLOR_TEXTO, overflow: "linebreak" },
    headStyles: { fillColor: COLOR_PRIMARIO, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: COLOR_PIE, textColor: COLOR_TEXTO, fontStyle: "bold" },
    alternateRowStyles: { fillColor: COLOR_FILA_ALTERNA },
    columnStyles,
    didParseCell: (data) => {
      // Encabezados y totales alineados como su columna.
      if (data.section !== "body" && esNumerico(tabla.columnas[data.column.index]?.formato ?? "texto")) {
        data.cell.styles.halign = "right"
      }
    },
  })

  // Pie con numeración "Página X de Y" en todas las páginas.
  const paginas = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina)
    doc.setDrawColor(225, 222, 235)
    doc.line(MARGEN, altoPagina - 11, anchoPagina - MARGEN, altoPagina - 11)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...COLOR_SECUNDARIO)
    doc.text(textoPdf(`${APP_NAME} · ${tabla.titulo}`), MARGEN, altoPagina - 6)
    doc.text(`Página ${pagina} de ${paginas}`, anchoPagina - MARGEN, altoPagina - 6, { align: "right" })
  }

  return doc.output("arraybuffer")
}
