"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useReporteMasAlquilados } from "@/hooks/use-reportes"
import { CATEGORIA_LABEL } from "@/lib/constants"
import { formatCurrency, formatNumber } from "@/lib/format"

import { ExportButtons } from "./export-buttons"
import { describirPeriodo, type Periodo } from "./periodo"
import { ReportEmpty, ReportError, ReportLoading, ReportSection } from "./report-section"

const chartConfig = {
  unidades: { label: "Unidades alquiladas", color: "var(--chart-1)" },
} satisfies ChartConfig

const ALTO_FILA = 34

function truncar(texto: string, max = 26) {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto
}

export function MasAlquiladosTab({ periodo }: { periodo: Periodo }) {
  const { data = [], isLoading, error } = useReporteMasAlquilados(periodo.desde, periodo.hasta)
  const top = useMemo(
    () =>
      data.slice(0, 10).map((fila) => ({
        etiqueta: `${fila.nombre} (${fila.talle})`,
        unidades: Number(fila.unidades_alquiladas),
        veces: Number(fila.veces_alquilado),
      })),
    [data]
  )

  return (
    <div className="space-y-4">
      <ReportSection
        title="Top 10 por unidades alquiladas"
        description={`Alquileres no cancelados iniciados entre el ${describirPeriodo(periodo)}.`}
        actions={<ExportButtons tipo="mas-alquilados" desde={periodo.desde} hasta={periodo.hasta} />}
      >
        {error ? (
          <ReportError />
        ) : isLoading ? (
          <ReportLoading rows={6} />
        ) : top.length === 0 ? (
          <ReportEmpty title="Sin alquileres en el período" />
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height: top.length * ALTO_FILA + 16 }}>
            <BarChart data={top} layout="vertical" margin={{ left: 4, right: 40, top: 4, bottom: 4 }} accessibilityLayer>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="etiqueta"
                width={190}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: string) => truncar(value)}
              />
              <ChartTooltip
                cursor={{ fillOpacity: 0.6 }}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(_, payload) => (payload?.[0]?.payload as { etiqueta?: string } | undefined)?.etiqueta ?? ""}
                    formatter={(value, _name, item) => (
                      <div className="grid w-full gap-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="size-2.5 rounded-[2px] bg-(--color-unidades)" />
                            Unidades
                          </span>
                          <span className="font-medium text-foreground tabular-nums">{formatNumber(Number(value))}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-muted-foreground">
                          <span className="pl-4">Alquileres</span>
                          <span className="tabular-nums">{formatNumber((item.payload as { veces: number }).veces)}</span>
                        </div>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="unidades" fill="var(--color-unidades)" radius={[0, 4, 4, 0]} barSize={18}>
                <LabelList dataKey="unidades" position="right" offset={8} className="fill-foreground text-xs tabular-nums" />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </ReportSection>

      <ReportSection title="Ranking completo" description="Hasta 50 disfraces con más movimiento en el período.">
        {error ? (
          <ReportError />
        ) : isLoading ? (
          <ReportLoading />
        ) : data.length === 0 ? (
          <ReportEmpty title="Sin datos" />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Disfraz</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Talle</TableHead>
                  <TableHead className="text-right">Alquileres</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((fila, index) => (
                  <TableRow key={fila.disfraz_id}>
                    <TableCell className="text-muted-foreground tabular">{index + 1}</TableCell>
                    <TableCell>
                      <Link href={`/dashboard/inventario/${fila.disfraz_id}`} className="font-medium hover:underline">
                        {fila.nombre}
                      </Link>
                      <div className="font-mono text-xs text-muted-foreground">{fila.codigo}</div>
                    </TableCell>
                    <TableCell>{CATEGORIA_LABEL[fila.categoria]}</TableCell>
                    <TableCell>{fila.talle}</TableCell>
                    <TableCell className="text-right tabular">{formatNumber(fila.veces_alquilado)}</TableCell>
                    <TableCell className="text-right font-medium tabular">{formatNumber(fila.unidades_alquiladas)}</TableCell>
                    <TableCell className="text-right tabular">{formatCurrency(fila.ingresos)}</TableCell>
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
