"use client"

import { useState } from "react"
import { FileSpreadsheet, FileText } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { Agrupacion } from "@/lib/queries/reportes"
import { nombreArchivo, type FormatoExportacion, type TipoReporte } from "@/lib/reportes/tipos"

type Props = {
  tipo: TipoReporte
  desde: string
  hasta: string
  agrupacion?: Agrupacion
  disabled?: boolean
}

/**
 * Descarga el reporte generado en el servidor. Se usa fetch (y no un link directo) para poder
 * mostrar el estado de carga y un error legible si la sesión expiró o falló la generación.
 */
export function ExportButtons({ tipo, desde, hasta, agrupacion = "dia", disabled }: Props) {
  const [descargando, setDescargando] = useState<FormatoExportacion | null>(null)

  async function descargar(formato: FormatoExportacion) {
    setDescargando(formato)
    try {
      const params = new URLSearchParams({ formato, desde, hasta, agrupacion })
      const response = await fetch(`/api/reportes/${tipo}?${params}`, { cache: "no-store" })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(
          response.status === 401 ? "Tu sesión expiró. Volvé a iniciar sesión." : (body?.error ?? "No se pudo generar el reporte.")
        )
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = nombreArchivo(tipo, desde, hasta, formato)
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el reporte.")
    } finally {
      setDescargando(null)
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => descargar("pdf")} disabled={disabled || descargando !== null}>
        {descargando === "pdf" ? <Spinner /> : <FileText />}
        Exportar PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => descargar("xlsx")} disabled={disabled || descargando !== null}>
        {descargando === "xlsx" ? <Spinner /> : <FileSpreadsheet />}
        Exportar Excel
      </Button>
    </div>
  )
}
