"use client"

import { useMemo, useState } from "react"
import { HandCoins, Receipt, Wallet, Wrench } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { StatCard } from "@/components/stat-card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useReporteIngresos } from "@/hooks/use-reportes"
import { formatCurrency, formatDate, formatNumber } from "@/lib/format"
import { totalizarIngresos, type Agrupacion } from "@/lib/queries/reportes"

import { ExportButtons } from "./export-buttons"
import type { Periodo } from "./periodo"
import { ReportEmpty, ReportError, ReportLoading, ReportSection } from "./report-section"

const chartConfig = {
  total: { label: "Ingresos", color: "var(--chart-1)" },
} satisfies ChartConfig

const compactCurrency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  notation: "compact",
  maximumFractionDigits: 1,
})

const AGRUPACIONES: { value: Agrupacion; label: string }[] = [
  { value: "dia", label: "Día" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
]

function etiquetaPeriodo(periodo: string, agrupacion: Agrupacion, larga = false): string {
  if (agrupacion === "mes") {
    const texto = formatDate(periodo, larga ? "MMMM yyyy" : "MMM yy")
    return texto.charAt(0).toUpperCase() + texto.slice(1)
  }
  if (agrupacion === "semana") return larga ? `Semana del ${formatDate(periodo)}` : formatDate(periodo, "dd/MM")
  return larga ? formatDate(periodo, "EEE dd/MM/yyyy") : formatDate(periodo, "dd/MM")
}

export function IngresosTab({ periodo }: { periodo: Periodo }) {
  const [agrupacion, setAgrupacion] = useState<Agrupacion>("dia")
  const { data, isLoading, error } = useReporteIngresos(periodo.desde, periodo.hasta, agrupacion)
  const filas = useMemo(
    () => (data ?? []).map((fila) => ({ ...fila, total: Number(fila.total) })),
    [data]
  )
  const totales = useMemo(() => totalizarIngresos(data ?? []), [data])
  const sinIngresos = !isLoading && totales.total === 0

  const tooltip = (
    <ChartTooltip
      cursor={agrupacion === "dia" ? { strokeWidth: 1 } : { fillOpacity: 0.6 }}
      content={
        <ChartTooltipContent
          indicator="dot"
          labelFormatter={(_, payload) => {
            const punto = payload?.[0]?.payload as { periodo?: string } | undefined
            return punto?.periodo ? etiquetaPeriodo(punto.periodo, agrupacion, true) : ""
          }}
          formatter={(value) => (
            <div className="flex w-full items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2.5 rounded-[2px] bg-(--color-total)" />
                Ingresos
              </span>
              <span className="font-medium text-foreground tabular-nums">{formatCurrency(Number(value))}</span>
            </div>
          )}
        />
      }
    />
  )

  const ejes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="periodo"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        minTickGap={24}
        tickFormatter={(value: string) => etiquetaPeriodo(value, agrupacion)}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={72}
        tickFormatter={(value: number) => compactCurrency.format(value)}
      />
    </>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Ingresos totales" value={formatCurrency(totales.total)} icon={Wallet} loading={isLoading} hint={`${formatNumber(totales.cantidad_pagos)} pagos`} />
        <StatCard label="Señas" value={formatCurrency(totales.senas)} icon={HandCoins} tone="info" loading={isLoading} />
        <StatCard label="Saldos cobrados" value={formatCurrency(totales.saldos)} icon={Receipt} tone="success" loading={isLoading} />
        <StatCard label="Cargos por daños" value={formatCurrency(totales.cargos)} icon={Wrench} tone="warning" loading={isLoading} />
      </div>

      <ReportSection
        title="Ingresos por período"
        description="Pagos registrados (señas, saldos y cargos), agrupados por fecha de cobro."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={agrupacion}
              onValueChange={(value) => value && setAgrupacion(value as Agrupacion)}
              aria-label="Agrupar por"
            >
              {AGRUPACIONES.map((a) => (
                <ToggleGroupItem key={a.value} value={a.value} className="px-3">
                  {a.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ExportButtons tipo="ingresos" desde={periodo.desde} hasta={periodo.hasta} agrupacion={agrupacion} />
          </div>
        }
      >
        {error ? (
          <ReportError />
        ) : isLoading ? (
          <ReportLoading rows={6} />
        ) : sinIngresos ? (
          <ReportEmpty title="Sin ingresos en el período" description="No hay pagos registrados entre esas fechas." />
        ) : (
          <div className="space-y-6">
            <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
              {agrupacion === "dia" ? (
                <AreaChart data={filas} margin={{ left: 4, right: 12, top: 8 }} accessibilityLayer>
                  {ejes}
                  {tooltip}
                  <Area
                    dataKey="total"
                    type="monotone"
                    stroke="var(--color-total)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fill="var(--color-total)"
                    fillOpacity={0.1}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={filas} margin={{ left: 4, right: 12, top: 8 }} accessibilityLayer>
                  {ejes}
                  {tooltip}
                  <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              )}
            </ChartContainer>

            <div className="max-h-80 overflow-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/60 backdrop-blur">
                  <TableRow>
                    <TableHead>{agrupacion === "dia" ? "Día" : agrupacion === "semana" ? "Semana" : "Mes"}</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Señas</TableHead>
                    <TableHead className="text-right">Saldos</TableHead>
                    <TableHead className="text-right">Cargos</TableHead>
                    <TableHead className="text-right">Pagos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data ?? []).map((fila) => (
                    <TableRow key={fila.periodo} className={Number(fila.total) === 0 ? "text-muted-foreground" : undefined}>
                      <TableCell>{etiquetaPeriodo(fila.periodo, agrupacion, true)}</TableCell>
                      <TableCell className="text-right font-medium tabular">{formatCurrency(fila.total)}</TableCell>
                      <TableCell className="text-right tabular">{formatCurrency(fila.senas)}</TableCell>
                      <TableCell className="text-right tabular">{formatCurrency(fila.saldos)}</TableCell>
                      <TableCell className="text-right tabular">{formatCurrency(fila.cargos)}</TableCell>
                      <TableCell className="text-right tabular">{formatNumber(fila.cantidad_pagos)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right font-semibold tabular">{formatCurrency(totales.total)}</TableCell>
                    <TableCell className="text-right font-semibold tabular">{formatCurrency(totales.senas)}</TableCell>
                    <TableCell className="text-right font-semibold tabular">{formatCurrency(totales.saldos)}</TableCell>
                    <TableCell className="text-right font-semibold tabular">{formatCurrency(totales.cargos)}</TableCell>
                    <TableCell className="text-right font-semibold tabular">{formatNumber(totales.cantidad_pagos)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        )}
      </ReportSection>
    </div>
  )
}
