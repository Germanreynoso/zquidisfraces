"use client"

import Link from "next/link"
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  HandCoins,
  PackageCheck,
  Plus,
  Receipt,
  Shirt,
  Undo2,
  Wallet,
  Wrench,
} from "lucide-react"

import { IngresosChart } from "@/components/dashboard/ingresos-chart"
import { StockEstadoCard } from "@/components/dashboard/stock-estado-card"
import { PageHeader } from "@/components/page-header"
import { useSession } from "@/components/session-provider"
import { StatCard } from "@/components/stat-card"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useProximasDevoluciones, useReservasProximas, useResumen, useTopDisfraces } from "@/hooks/use-dashboard"
import { CATEGORIA_LABEL, ESTADO_RESERVA_LABEL, ESTADO_RESERVA_TONE } from "@/lib/constants"
import { daysBetween, formatCurrency, formatDate, formatDateLong, formatNumber, todayISO } from "@/lib/format"

function saludo(): string {
  const hora = Number(
    new Intl.DateTimeFormat("es-AR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" }).format(
      new Date()
    )
  )
  if (hora < 6) return "Buenas noches"
  if (hora < 12) return "Buen día"
  if (hora < 20) return "Buenas tardes"
  return "Buenas noches"
}

function vencimiento(fecha: string, hoy: string): { label: string; tone: "danger" | "warning" | "info" } {
  const dias = daysBetween(hoy, fecha)
  if (dias < 0) return { label: `${Math.abs(dias)} día${dias === -1 ? "" : "s"} de atraso`, tone: "danger" }
  if (dias === 0) return { label: "Vence hoy", tone: "warning" }
  if (dias === 1) return { label: "Vence mañana", tone: "warning" }
  return { label: `En ${dias} días`, tone: "info" }
}

export function DashboardView() {
  const { profile } = useSession()
  const hoy = todayISO()
  const resumen = useResumen()
  const devoluciones = useProximasDevoluciones()
  const reservas = useReservasProximas()
  const top = useTopDisfraces()
  const r = resumen.data
  const loading = resumen.isLoading
  const maxTop = Math.max(...(top.data ?? []).map((d) => Number(d.unidades_alquiladas)), 1)

  return (
    <>
      <PageHeader
        title={`${saludo()}${profile.nombre ? `, ${profile.nombre.split(" ")[0]}` : ""}`}
        description={<span className="capitalize">{formatDateLong(hoy)}</span>}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/dashboard/devoluciones">
                <Undo2 />
                Registrar devolución
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/reservas/nueva">
                <CalendarPlus />
                Nueva reserva
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/alquileres/nuevo">
                <Plus />
                Nuevo alquiler
              </Link>
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Indicadores">
        <StatCard
          label="Total disfraces"
          icon={Shirt}
          tone="violet"
          loading={loading}
          value={formatNumber(r?.total_unidades)}
          hint={r ? `${formatNumber(r.modelos)} modelos` : undefined}
          href="/dashboard/inventario"
        />
        <StatCard
          label="Disponibles"
          icon={PackageCheck}
          tone="success"
          loading={loading}
          value={formatNumber(r?.disponibles)}
          hint="Listos para alquilar"
          href="/dashboard/inventario"
        />
        <StatCard
          label="Alquilados"
          icon={Receipt}
          tone="info"
          loading={loading}
          value={formatNumber(r?.alquilados)}
          hint={r ? `${formatNumber(r.alquileres_activos)} alquileres activos` : undefined}
          href="/dashboard/alquileres"
        />
        <StatCard
          label="En mantenimiento"
          icon={Wrench}
          tone="warning"
          loading={loading}
          value={formatNumber(r?.mantenimiento)}
          hint={r && r.extraviados > 0 ? `${formatNumber(r.extraviados)} extraviados` : "Sin extraviados"}
          href="/dashboard/inventario"
        />
        <StatCard
          label="Próximos a devolver"
          icon={CalendarClock}
          tone="info"
          loading={loading}
          value={formatNumber(r?.proximos_a_devolver)}
          hint="Hoy y próximos 3 días"
          href="/dashboard/devoluciones"
        />
        <StatCard
          label="Devoluciones atrasadas"
          icon={AlertTriangle}
          tone={r && r.atrasados > 0 ? "danger" : "neutral"}
          loading={loading}
          value={formatNumber(r?.atrasados)}
          hint={r && r.atrasados > 0 ? "Requieren seguimiento" : "Todo al día"}
          href="/dashboard/alertas"
        />
        <StatCard
          label="Ingresos del mes"
          icon={Wallet}
          tone="success"
          loading={loading}
          value={formatCurrency(r?.ingresos_mes)}
          hint="Cobrado en el mes en curso"
          href="/dashboard/reportes"
        />
        <StatCard
          label="Saldo por cobrar"
          icon={HandCoins}
          tone={r && r.saldo_por_cobrar > 0 ? "warning" : "neutral"}
          loading={loading}
          value={formatCurrency(r?.saldo_por_cobrar)}
          hint="Alquileres no cancelados"
          href="/dashboard/alquileres"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <IngresosChart />
        <StockEstadoCard resumen={r} loading={loading} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Próximas devoluciones</CardTitle>
            <CardDescription>Alquileres activos por fecha de vencimiento.</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/devoluciones">Ver todas</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {devoluciones.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !devoluciones.data?.length ? (
              <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
                <CheckCircle2 className="size-5 text-emerald-600" />
                No hay alquileres activos.
              </div>
            ) : (
              <ul className="divide-y">
                {devoluciones.data.map((a) => {
                  const v = vencimiento(a.fecha_devolucion, hoy)
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/dashboard/alquileres/${a.id}`}
                        className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{a.cliente_nombre_completo}</div>
                          <div className="truncate text-xs text-muted-foreground">{a.resumen_items}</div>
                        </div>
                        <div className="hidden text-right text-xs text-muted-foreground sm:block">
                          <div className="tabular">{formatDate(a.fecha_devolucion)}</div>
                          {a.saldo_pendiente > 0 && (
                            <div className="tabular">Saldo {formatCurrency(a.saldo_pendiente)}</div>
                          )}
                        </div>
                        <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Reservas próximas</CardTitle>
              <CardAction>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/reservas">Ver todas</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {reservas.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : !reservas.data?.length ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Sin reservas próximas.</p>
              ) : (
                <ul className="space-y-1">
                  {reservas.data.map((reserva) => (
                    <li key={reserva.id}>
                      <Link
                        href={`/dashboard/reservas/${reserva.id}`}
                        className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                      >
                        <div className="grid w-11 shrink-0 place-items-center rounded-lg border bg-muted/40 py-1 text-center leading-none">
                          <span className="text-[10px] text-muted-foreground uppercase">
                            {formatDate(reserva.fecha_inicio, "MMM")}
                          </span>
                          <span className="font-heading text-base font-semibold tabular">
                            {formatDate(reserva.fecha_inicio, "dd")}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{reserva.cliente_nombre_completo}</div>
                          <div className="truncate text-xs text-muted-foreground">{reserva.resumen_items}</div>
                        </div>
                        <StatusBadge tone={ESTADO_RESERVA_TONE[reserva.estado]} dot={false}>
                          {ESTADO_RESERVA_LABEL[reserva.estado]}
                        </StatusBadge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Más alquilados</CardTitle>
              <CardDescription>Unidades alquiladas · últimos 90 días</CardDescription>
            </CardHeader>
            <CardContent>
              {top.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !top.data?.length ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Todavía no hay alquileres.</p>
              ) : (
                <ol className="space-y-3">
                  {top.data.map((d) => {
                    const unidades = Number(d.unidades_alquiladas)
                    return (
                      <li key={d.disfraz_id}>
                        <Link href={`/dashboard/inventario/${d.disfraz_id}`} className="group block space-y-1">
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="truncate font-medium group-hover:underline">
                              {d.nombre} <span className="font-normal text-muted-foreground">· {d.talle}</span>
                            </span>
                            <span className="shrink-0 text-muted-foreground tabular">{formatNumber(unidades)} u.</span>
                          </div>
                          <div
                            className="h-1.5 w-full rounded-full bg-muted"
                            title={`${d.nombre}: ${unidades} unidades en ${d.veces_alquilado} alquileres (${CATEGORIA_LABEL[d.categoria]})`}
                          >
                            <div
                              className="h-full rounded-full bg-[var(--chart-1)]"
                              style={{ width: `${(unidades / maxTop) * 100}%` }}
                            />
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  )
}
