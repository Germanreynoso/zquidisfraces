"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronRight, PartyPopper, RefreshCw } from "lucide-react"

import { DataTableFacetedFilter } from "@/components/data-table/data-table-toolbar"
import { ALERTA_ICON } from "@/components/layout/notifications-bell"
import { PageHeader } from "@/components/page-header"
import { StatusBadge, TONE_DOT } from "@/components/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useAlertas } from "@/hooks/use-alertas"
import { SEVERIDAD_TONE, TIPO_ALERTA_LABEL, type Tone } from "@/lib/constants"
import { formatDate } from "@/lib/format"
import { alertaHref } from "@/lib/queries/alertas"
import { cn } from "@/lib/utils"
import type { Alerta, SeveridadAlerta, TipoAlerta } from "@/types/domain"

/** Orden de presentación y severidad de cada tipo (coincide con v_alertas). */
const TIPOS: { tipo: TipoAlerta; severidad: SeveridadAlerta; ayuda: string }[] = [
  { tipo: "devolucion_vencida", severidad: "alta", ayuda: "Alquileres que ya debían volver" },
  { tipo: "extraviado", severidad: "alta", ayuda: "Disfraces con unidades perdidas" },
  { tipo: "devolucion_proxima", severidad: "media", ayuda: "Vencen hoy o mañana" },
  { tipo: "stock_bajo", severidad: "media", ayuda: "Menos disponibles que el mínimo" },
  { tipo: "reserva_proxima", severidad: "baja", ayuda: "Retiran en los próximos 3 días" },
]

const SEVERIDAD_LABEL: Record<SeveridadAlerta, string> = { alta: "Alta", media: "Media", baja: "Baja" }

const TIPO_OPTIONS = TIPOS.map(({ tipo, severidad }) => ({
  value: tipo,
  label: TIPO_ALERTA_LABEL[tipo],
  tone: SEVERIDAD_TONE[severidad],
}))

const SEVERIDAD_OPTIONS = (Object.keys(SEVERIDAD_LABEL) as SeveridadAlerta[]).map((severidad) => ({
  value: severidad,
  label: SEVERIDAD_LABEL[severidad],
  tone: SEVERIDAD_TONE[severidad],
}))

const CARD_TONE: Record<Tone, string> = {
  success: "text-emerald-600 dark:text-emerald-300",
  info: "text-sky-600 dark:text-sky-300",
  violet: "text-primary",
  warning: "text-amber-600 dark:text-amber-300",
  danger: "text-rose-600 dark:text-rose-300",
  neutral: "text-muted-foreground",
}

export function AlertasView() {
  const { data: alertas = [], isLoading, isFetching, error, refetch, dataUpdatedAt } = useAlertas()
  const [tipos, setTipos] = useState<string[]>([])
  const [severidades, setSeveridades] = useState<string[]>([])

  const conteo = useMemo(() => {
    const porTipo = new Map<TipoAlerta, number>()
    for (const alerta of alertas) porTipo.set(alerta.tipo, (porTipo.get(alerta.tipo) ?? 0) + 1)
    return porTipo
  }, [alertas])

  const filtradas = useMemo(
    () =>
      alertas.filter(
        (a) => (tipos.length === 0 || tipos.includes(a.tipo)) && (severidades.length === 0 || severidades.includes(a.severidad))
      ),
    [alertas, tipos, severidades]
  )

  const grupos = useMemo(
    () =>
      TIPOS.map(({ tipo, severidad }) => ({
        tipo,
        severidad,
        items: filtradas.filter((a) => a.tipo === tipo),
      })).filter((grupo) => grupo.items.length > 0),
    [filtradas]
  )

  const toggleTipo = (tipo: TipoAlerta) =>
    setTipos((actual) => (actual.length === 1 && actual[0] === tipo ? [] : [tipo]))

  const hayFiltros = tipos.length > 0 || severidades.length > 0

  return (
    <>
      <PageHeader
        title="Alertas"
        description={
          dataUpdatedAt
            ? `Se recalculan automáticamente cada minuto · actualizado ${new Date(dataUpdatedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`
            : "Se recalculan automáticamente cada minuto."
        }
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn(isFetching && "animate-spin")} />
            Actualizar
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar las alertas</AlertTitle>
          <AlertDescription>Revisá tu conexión e intentá nuevamente.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {TIPOS.map(({ tipo, severidad, ayuda }) => {
          const Icon = ALERTA_ICON[tipo]
          const cantidad = conteo.get(tipo) ?? 0
          const activo = tipos.length === 1 && tipos[0] === tipo
          const tone: Tone = cantidad > 0 ? SEVERIDAD_TONE[severidad] : "neutral"
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => toggleTipo(tipo)}
              aria-pressed={activo}
              className="rounded-xl text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Card
                className={cn(
                  "h-full gap-2 p-4 transition-colors hover:border-primary/40 hover:bg-accent/40",
                  activo && "border-primary/60 bg-accent/50"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{TIPO_ALERTA_LABEL[tipo]}</span>
                  <Icon className={cn("size-4", CARD_TONE[tone])} />
                </div>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <span className="font-heading text-3xl font-semibold tracking-tight">{cantidad}</span>
                )}
                <span className="text-xs text-muted-foreground">{ayuda}</span>
              </Card>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DataTableFacetedFilter title="Tipo" options={TIPO_OPTIONS} value={tipos} onChange={setTipos} searchable={false} />
        <DataTableFacetedFilter
          title="Severidad"
          options={SEVERIDAD_OPTIONS}
          value={severidades}
          onChange={setSeveridades}
          searchable={false}
        />
        {hayFiltros && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTipos([])
              setSeveridades([])
            }}
          >
            Limpiar filtros
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {filtradas.length} de {alertas.length} alerta{alertas.length === 1 ? "" : "s"}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : grupos.length === 0 ? (
        <Empty className="border py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PartyPopper />
            </EmptyMedia>
            <EmptyTitle>Todo en orden</EmptyTitle>
            <EmptyDescription>
              {hayFiltros ? "No hay alertas con los filtros elegidos." : "No hay devoluciones vencidas, faltantes ni stock bajo."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-6">
          {grupos.map((grupo) => (
            <GrupoAlertas key={grupo.tipo} tipo={grupo.tipo} severidad={grupo.severidad} items={grupo.items} />
          ))}
        </div>
      )}
    </>
  )
}

function GrupoAlertas({ tipo, severidad, items }: { tipo: TipoAlerta; severidad: SeveridadAlerta; items: Alerta[] }) {
  const Icon = ALERTA_ICON[tipo]
  const tone = SEVERIDAD_TONE[severidad]

  return (
    <section className="space-y-2" aria-labelledby={`grupo-${tipo}`}>
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h2 id={`grupo-${tipo}`} className="font-sans text-sm font-semibold tracking-normal">
          {TIPO_ALERTA_LABEL[tipo]}
        </h2>
        <span className="text-sm text-muted-foreground">· {items.length}</span>
        <StatusBadge tone={tone} className="ml-1">
          Severidad {SEVERIDAD_LABEL[severidad].toLowerCase()}
        </StatusBadge>
      </div>
      <Card className="gap-0 overflow-hidden p-0">
        <ul className="divide-y">
          {items.map((alerta) => (
            <li key={alerta.id}>
              <Link
                href={alertaHref(alerta)}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <span aria-hidden className={cn("size-2 shrink-0 rounded-full", TONE_DOT[tone])} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{alerta.titulo}</span>
                  <span className="block truncate text-xs text-muted-foreground">{alerta.descripcion}</span>
                </span>
                {alerta.fecha && (
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{formatDate(alerta.fecha)}</span>
                )}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}
