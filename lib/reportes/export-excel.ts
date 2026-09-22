import ExcelJS from "exceljs"

import { APP_NAME } from "@/lib/constants"
import { formatDateTime } from "@/lib/format"

import type { Celda, FormatoColumna, TablaReporte } from "./tipos"

const NUM_FMT: Partial<Record<FormatoColumna, string>> = {
  moneda: '"$" #,##0;[Red]-"$" #,##0',
  entero: "#,##0",
  fecha: "dd/mm/yyyy",
  mes: "mm/yyyy",
}

const ARGB_PRIMARIO = "FF673AC8"
const ARGB_PIE = "FFEEEAFA"
const ARGB_BORDE = "FFD9D4EA"

/** Fecha "YYYY-MM-DD" → Date en UTC (Excel guarda fechas sin zona: evita corrimientos de día). */
function fechaExcel(valor: string): Date {
  const [anio, mes, dia] = valor.slice(0, 10).split("-").map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia))
}

/** Valor tipado para Excel: números como números y fechas como fechas (no texto). */
function valorCelda(valor: Celda, formato: FormatoColumna): ExcelJS.CellValue {
  if (valor === null || valor === "") return null
  if (formato === "moneda" || formato === "entero") return Number(valor)
  if ((formato === "fecha" || formato === "mes") && typeof valor === "string") return fechaExcel(valor)
  return valor
}

/** Genera el .xlsx del reporte: título, período, encabezado en negrita, autofiltro, formatos numéricos y totales. */
export async function generarExcel(tabla: TablaReporte, emitido: Date = new Date()): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = APP_NAME
  workbook.created = emitido

  const columnas = tabla.columnas.length
  // Los nombres de hoja no admiten : \ / ? * [ ] y tienen máximo 31 caracteres.
  const worksheet = workbook.addWorksheet(tabla.titulo.replace(/[:\\/?*[\]]/g, " ").slice(0, 31))

  worksheet.mergeCells(1, 1, 1, columnas)
  const titulo = worksheet.getCell(1, 1)
  titulo.value = `${APP_NAME} · ${tabla.titulo}`
  titulo.font = { bold: true, size: 14, color: { argb: ARGB_PRIMARIO } }

  worksheet.mergeCells(2, 1, 2, columnas)
  worksheet.getCell(2, 1).value = `${tabla.periodo} · Emitido: ${formatDateTime(emitido)}`
  worksheet.getCell(2, 1).font = { size: 10, color: { argb: "FF6E6A80" } }

  let fila = 3
  for (const item of tabla.resumen ?? []) {
    worksheet.getCell(fila, 1).value = item.label
    worksheet.getCell(fila, 1).font = { bold: true }
    worksheet.mergeCells(fila, 2, fila, Math.max(2, Math.min(columnas, 4)))
    worksheet.getCell(fila, 2).value = item.valor
    fila++
  }

  const filaEncabezado = fila + 1
  const encabezado = worksheet.getRow(filaEncabezado)
  tabla.columnas.forEach((columna, index) => {
    const celda = encabezado.getCell(index + 1)
    celda.value = columna.header
    celda.font = { bold: true, color: { argb: "FFFFFFFF" } }
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB_PRIMARIO } }
    celda.alignment = {
      vertical: "middle",
      horizontal: columna.formato === "moneda" || columna.formato === "entero" ? "right" : "left",
    }
    worksheet.getColumn(index + 1).width = columna.ancho + 2
  })
  encabezado.height = 20

  tabla.filas.forEach((datos, offset) => {
    const row = worksheet.getRow(filaEncabezado + 1 + offset)
    datos.forEach((valor, index) => {
      const formato = tabla.columnas[index].formato
      const celda = row.getCell(index + 1)
      celda.value = valorCelda(valor, formato)
      const numFmt = NUM_FMT[formato]
      if (numFmt) celda.numFmt = numFmt
    })
  })

  const ultimaFilaDatos = filaEncabezado + Math.max(tabla.filas.length, 1)

  if (tabla.totales && tabla.filas.length) {
    const row = worksheet.getRow(ultimaFilaDatos + 1)
    tabla.totales.forEach((valor, index) => {
      const formato = tabla.columnas[index].formato
      const celda = row.getCell(index + 1)
      celda.value = typeof valor === "string" ? valor : valorCelda(valor, formato)
      const numFmt = NUM_FMT[formato]
      if (numFmt && typeof valor === "number") celda.numFmt = numFmt
      celda.font = { bold: true }
      celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB_PIE } }
      celda.border = { top: { style: "thin", color: { argb: ARGB_BORDE } } }
    })
  }

  if (!tabla.filas.length) {
    worksheet.getCell(filaEncabezado + 1, 1).value = "Sin datos para el período elegido."
  }

  worksheet.autoFilter = {
    from: { row: filaEncabezado, column: 1 },
    to: { row: ultimaFilaDatos, column: columnas },
  }
  worksheet.views = [{ state: "frozen", ySplit: filaEncabezado }]

  const buffer = await workbook.xlsx.writeBuffer()
  const bytes = new Uint8Array(buffer as ArrayBuffer)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}
