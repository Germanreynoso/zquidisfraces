"use client"

import Link from "next/link"
import { AlertTriangle, Bell, BellRing, CalendarClock, PackageX, Undo2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { TONE_DOT } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useAlertas } from "@/hooks/use-alertas"
import { SEVERIDAD_TONE } from "@/lib/constants"
import { alertaHref } from "@/lib/queries/alertas"
import { cn } from "@/lib/utils"
import type { TipoAlerta } from "@/types/domain"

export const ALERTA_ICON: Record<TipoAlerta, LucideIcon> = {
  devolucion_vencida: AlertTriangle,
  devolucion_proxima: Undo2,
  stock_bajo: PackageX,
  extraviado: PackageX,
  reserva_proxima: CalendarClock,
}

/** Centro de notificaciones del header: alertas calculadas, refrescadas cada minuto. */
export function NotificationsBell() {
  const { data: alertas, isLoading } = useAlertas()
  const total = alertas?.length ?? 0
  const altas = alertas?.filter((a) => a.severidad === "alta").length ?? 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notificaciones (${total})`}>
          {total > 0 ? <BellRing /> : <Bell />}
          {total > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] leading-none font-semibold text-white tabular",
                altas > 0 ? "bg-rose-500" : "bg-amber-500"
              )}
            >
              {total > 99 ? "99+" : total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notificaciones</p>
            <p className="text-xs text-muted-foreground">
              {total === 0 ? "Todo en orden" : `${total} alerta${total === 1 ? "" : "s"} activa${total === 1 ? "" : "s"}`}
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/alertas">Ver todas</Link>
          </Button>
        </div>
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : total === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No hay alertas pendientes.</div>
          ) : (
            <ul className="divide-y">
              {alertas!.slice(0, 12).map((alerta) => {
                const Icon = ALERTA_ICON[alerta.tipo]
                return (
                  <li key={alerta.id}>
                    <Link
                      href={alertaHref(alerta)}
                      className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                    >
                      <span className="relative mt-0.5">
                        <Icon className="size-4 text-muted-foreground" />
                        <span
                          className={cn(
                            "absolute -top-0.5 -right-0.5 size-1.5 rounded-full",
                            TONE_DOT[SEVERIDAD_TONE[alerta.severidad]]
                          )}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{alerta.titulo}</span>
                        <span className="block truncate text-xs text-muted-foreground">{alerta.descripcion}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
