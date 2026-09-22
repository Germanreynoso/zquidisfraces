"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useIngresosRecientes } from "@/hooks/use-dashboard"
import { formatCurrency, formatDate } from "@/lib/format"

const config = {
  total: { label: "Ingresos", color: "var(--chart-1)" },
} satisfies ChartConfig

const compactCurrency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  notation: "compact",
  maximumFractionDigits: 1,
})

/** Ingresos cobrados por día (señas, saldos y cargos) de los últimos 30 días. Una sola serie. */
export function IngresosChart() {
  const { data, isLoading } = useIngresosRecientes()
  const total = data?.reduce((sum, row) => sum + Number(row.total), 0) ?? 0
  const dias = data?.filter((row) => Number(row.total) > 0).length ?? 0

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardDescription>Ingresos · últimos 30 días</CardDescription>
        <CardTitle className="font-heading text-3xl font-semibold tabular">
          {isLoading ? <Skeleton className="h-9 w-40" /> : formatCurrency(total)}
        </CardTitle>
        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            Cobrado en {dias} de 30 días · incluye señas, saldos y cargos
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <ChartContainer config={config} className="aspect-auto h-56 w-full">
            <BarChart data={data} margin={{ left: 4, right: 4, top: 8 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="periodo"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(value: string) => formatDate(value, "dd/MM")}
              />
              <YAxis
                width={56}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => compactCurrency.format(value)}
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => formatDate(String(value), "EEEE dd/MM")}
                    formatter={(value) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">Ingresos</span>
                        <span className="font-medium tabular">{formatCurrency(Number(value))}</span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
