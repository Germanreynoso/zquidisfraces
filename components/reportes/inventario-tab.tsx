"use client"

import { useMemo } from "react"
import Link from "next/link"

import { StatusBadge } from "@/components/status-badge"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useReporteInventario } from "@/hooks/use-reportes"
import { CATEGORIA_LABEL, ESTADO_DISFRAZ_LABEL, ESTADO_DISFRAZ_TONE } from "@/lib/constants"
import { formatCurrency, formatNumber, todayISO } from "@/lib/format"
import { resumirInventarioPorCategoria } from "@/lib/queries/reportes"

import { ExportButtons } from "./export-buttons"
import { ReportEmpty, ReportError, ReportLoading, ReportSection } from "./report-section"

export function InventarioTab() {
  const { data = [], isLoading, error } = useReporteInventario()
  const categorias = useMemo(() => resumirInventarioPorCategoria(data), [data])
  const totales = useMemo(
    () =>
      categorias.reduce(
        (acc, c) => ({
          modelos: acc.modelos + c.modelos,
          unidades: acc.unidades + c.unidades,
          disponibles: acc.disponibles + c.disponibles,
          alquiladas: acc.alquiladas + c.alquiladas,
          mantenimiento: acc.mantenimiento + c.mantenimiento,
          extraviadas: acc.extraviadas + c.extraviadas,
          valor_reposicion: acc.valor_reposicion + c.valor_reposicion,
        }),
        { modelos: 0, unidades: 0, disponibles: 0, alquiladas: 0, mantenimiento: 0, extraviadas: 0, valor_reposicion: 0 }
      ),
    [categorias]
  )
  const hoy = todayISO()

  return (
    <div className="space-y-4">
      <ReportSection
        title="Resumen por categoría"
        description="Foto actual del stock (no depende del período elegido)."
        actions={<ExportButtons tipo="inventario" desde={hoy} hasta={hoy} />}
      >
        {error ? (
          <ReportError />
        ) : isLoading ? (
          <ReportLoading />
        ) : categorias.length === 0 ? (
          <ReportEmpty title="No hay disfraces cargados" />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Modelos</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Disponibles</TableHead>
                  <TableHead className="text-right">Alquiladas</TableHead>
                  <TableHead className="text-right">Mantenimiento</TableHead>
                  <TableHead className="text-right">Extraviadas</TableHead>
                  <TableHead className="text-right">Valor de reposición</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.map((c) => (
                  <TableRow key={c.categoria}>
                    <TableCell className="font-medium">{CATEGORIA_LABEL[c.categoria]}</TableCell>
                    <TableCell className="text-right tabular">{formatNumber(c.modelos)}</TableCell>
                    <TableCell className="text-right tabular">{formatNumber(c.unidades)}</TableCell>
                    <TableCell className="text-right tabular">{formatNumber(c.disponibles)}</TableCell>
                    <TableCell className="text-right tabular">{formatNumber(c.alquiladas)}</TableCell>
                    <TableCell className="text-right tabular">{formatNumber(c.mantenimiento)}</TableCell>
                    <TableCell className="text-right tabular">{formatNumber(c.extraviadas)}</TableCell>
                    <TableCell className="text-right tabular">{formatCurrency(c.valor_reposicion)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold tabular">{formatNumber(totales.modelos)}</TableCell>
                  <TableCell className="text-right font-semibold tabular">{formatNumber(totales.unidades)}</TableCell>
                  <TableCell className="text-right font-semibold tabular">{formatNumber(totales.disponibles)}</TableCell>
                  <TableCell className="text-right font-semibold tabular">{formatNumber(totales.alquiladas)}</TableCell>
                  <TableCell className="text-right font-semibold tabular">{formatNumber(totales.mantenimiento)}</TableCell>
                  <TableCell className="text-right font-semibold tabular">{formatNumber(totales.extraviadas)}</TableCell>
                  <TableCell className="text-right font-semibold tabular">{formatCurrency(totales.valor_reposicion)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </ReportSection>

      <ReportSection title="Detalle del inventario" description={`${formatNumber(data.length)} disfraces activos.`}>
        {error ? (
          <ReportError />
        ) : isLoading ? (
          <ReportLoading rows={8} />
        ) : data.length === 0 ? (
          <ReportEmpty title="Sin disfraces" />
        ) : (
          <div className="max-h-[32rem] overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <TableRow>
                  <TableHead>Disfraz</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Talle</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Disp.</TableHead>
                  <TableHead className="text-right">Alq.</TableHead>
                  <TableHead className="text-right">Mant.</TableHead>
                  <TableHead className="text-right">Extr.</TableHead>
                  <TableHead className="text-right">Valor reposición</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link href={`/dashboard/inventario/${d.id}`} className="font-medium hover:underline">
                        {d.nombre}
                      </Link>
                      <div className="font-mono text-xs text-muted-foreground">{d.codigo}</div>
                    </TableCell>
                    <TableCell>{CATEGORIA_LABEL[d.categoria]}</TableCell>
                    <TableCell>{d.talle}</TableCell>
                    <TableCell>
                      <StatusBadge tone={ESTADO_DISFRAZ_TONE[d.estado_efectivo]}>{ESTADO_DISFRAZ_LABEL[d.estado_efectivo]}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-right tabular">{d.cantidad_total}</TableCell>
                    <TableCell className="text-right font-medium tabular">{d.cantidad_disponible}</TableCell>
                    <TableCell className="text-right tabular">{d.cantidad_alquilada}</TableCell>
                    <TableCell className="text-right tabular">{d.cantidad_mantenimiento}</TableCell>
                    <TableCell className="text-right tabular">{d.cantidad_extraviada}</TableCell>
                    <TableCell className="text-right tabular">
                      {formatCurrency(d.cantidad_total * Number(d.precio_reposicion))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ReportSection>
    </div>
  )
}
