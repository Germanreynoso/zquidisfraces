"use client"

import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { DashboardResumen } from "@/types/domain"

// Colores de estado validados para daltonismo y contraste (claro y oscuro).
const ESTADOS = [
  { key: "disponibles", label: "Disponibles", color: "bg-emerald-600", filtro: "disponible" },
  { key: "alquilados", label: "Alquilados", color: "bg-sky-600", filtro: "alquilado" },
  { key: "mantenimiento", label: "Mantenimiento", color: "bg-amber-600", filtro: "mantenimiento" },
  { key: "extraviados", label: "Extraviados", color: "bg-rose-600", filtro: "extraviado" },
] as const

/** Composición del stock en unidades: barra 100 % con etiquetas directas y valores. */
export function StockEstadoCard({ resumen, loading }: { resumen?: DashboardResumen; loading?: boolean }) {
  const total = resumen?.total_unidades ?? 0

  return (
    <Card>
      <CardHeader>
        <CardDescription>Stock por estado</CardDescription>
        <CardTitle className="font-heading text-3xl font-semibold tabular">
          {loading ? <Skeleton className="h-9 w-24" /> : `${formatNumber(total)} u.`}
        </CardTitle>
        {!loading && resumen && (
          <p className="text-xs text-muted-foreground">{formatNumber(resumen.modelos)} modelos activos en catálogo</p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {loading || !resumen ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Distribución del stock por estado">
              {total === 0 ? (
                <span className="h-full w-full bg-muted" />
              ) : (
                ESTADOS.map((estado) => {
                  const value = resumen[estado.key]
                  if (value <= 0) return null
                  return (
                    <Tooltip key={estado.key}>
                      <TooltipTrigger asChild>
                        <span
                          className={cn("h-full first:rounded-l-full last:rounded-r-full", estado.color)}
                          style={{ width: `${(value / total) * 100}%` }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        {estado.label}: {formatNumber(value)} ({Math.round((value / total) * 100)} %)
                      </TooltipContent>
                    </Tooltip>
                  )
                })
              )}
            </div>
            <ul className="grid grid-cols-2 gap-3">
              {ESTADOS.map((estado) => {
                const value = resumen[estado.key]
                return (
                  <li key={estado.key}>
                    <Link
                      href={`/dashboard/inventario?estado=${estado.filtro}`}
                      className="flex items-center gap-2 rounded-lg p-1.5 text-sm transition-colors hover:bg-muted/60"
                    >
                      <span className={cn("size-2.5 shrink-0 rounded-full", estado.color)} aria-hidden />
                      <span className="text-muted-foreground">{estado.label}</span>
                      <span className="ml-auto font-medium tabular">{formatNumber(value)}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
