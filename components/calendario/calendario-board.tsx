"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { DatesSetArg, EventClickArg, EventContentArg, EventInput, EventMountArg } from "@fullcalendar/core"
import esLocale from "@fullcalendar/core/locales/es"
import dayGridPlugin from "@fullcalendar/daygrid"
import listPlugin from "@fullcalendar/list"
import FullCalendar from "@fullcalendar/react"
import { AlertCircle, CalendarRange, ChevronLeft, ChevronRight, Receipt, Undo2, type LucideIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useEventosCalendario, type RangoCalendario } from "@/hooks/use-calendario"
import { addDaysISO, toISODate } from "@/lib/format"
import type { EventoCalendario, TipoEvento } from "@/lib/queries/calendario"
import { cn } from "@/lib/utils"

type Vista = "dayGridMonth" | "dayGridWeek" | "listWeek"

const VISTAS: { value: Vista; label: string }[] = [
  { value: "dayGridMonth", label: "Mes" },
  { value: "dayGridWeek", label: "Semana" },
  { value: "listWeek", label: "Lista" },
]

const TIPOS: { tipo: TipoEvento; label: string; color: string; icon: LucideIcon }[] = [
  { tipo: "alquiler", label: "Alquileres activos", color: "var(--ev-alquiler)", icon: Receipt },
  { tipo: "reserva", label: "Reservas", color: "var(--ev-reserva)", icon: CalendarRange },
  { tipo: "devolucion", label: "Devoluciones programadas", color: "var(--ev-devolucion)", icon: Undo2 },
]

const ICONO: Record<TipoEvento, LucideIcon> = { alquiler: Receipt, reserva: CalendarRange, devolucion: Undo2 }

type ExtendedProps = { href: string; resumen: string | null; tipo: TipoEvento }

function toEventInput(evento: EventoCalendario): EventInput {
  const base = evento.atrasado ? "var(--ev-atrasado)" : `var(--ev-${evento.tipo})`
  const extendedProps: ExtendedProps = { href: evento.href, resumen: evento.resumen, tipo: evento.tipo }
  return {
    id: evento.id,
    title: evento.titulo,
    start: evento.inicio,
    // FullCalendar usa fin exclusivo para eventos de día completo.
    end: addDaysISO(evento.fin, 1),
    allDay: true,
    backgroundColor: evento.pendiente ? `color-mix(in oklch, ${base} 14%, transparent)` : base,
    borderColor: base,
    textColor: evento.pendiente ? "var(--ev-reserva-text)" : "var(--ev-text)",
    classNames: [`ev-${evento.tipo}`, evento.atrasado ? "ev-atrasado" : "", evento.pendiente ? "ev-pendiente" : ""].filter(
      Boolean
    ),
    extendedProps,
  }
}

function renderEventContent(arg: EventContentArg) {
  const { tipo, resumen } = arg.event.extendedProps as ExtendedProps
  const Icon = ICONO[tipo]
  const isList = arg.view.type.startsWith("list")
  return (
    <div className={cn("flex min-w-0 items-center gap-1 overflow-hidden", !isList && "px-1 py-px text-xs")}>
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className="truncate font-medium">{arg.event.title}</span>
      {isList && resumen && <span className="truncate text-muted-foreground">· {resumen}</span>}
    </div>
  )
}

function vistaInicial(): Vista {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "listWeek" : "dayGridMonth"
}

/** Calendario de alquileres, reservas y devoluciones (se renderiza solo en el cliente). */
export default function CalendarioBoard() {
  const router = useRouter()
  const calendarRef = useRef<FullCalendar>(null)
  const [vistaDeInicio] = useState<Vista>(vistaInicial)
  const [vista, setVista] = useState<Vista>(vistaDeInicio)
  const [titulo, setTitulo] = useState("")
  const [rango, setRango] = useState<RangoCalendario | null>(null)
  const [visibles, setVisibles] = useState<Record<TipoEvento, boolean>>({
    alquiler: true,
    reserva: true,
    devolucion: true,
  })
  const { data: eventos = [], isFetching, isError } = useEventosCalendario(rango)

  const events = useMemo(() => eventos.filter((e) => visibles[e.tipo]).map(toEventInput), [eventos, visibles])

  const conteo = useMemo(() => {
    const result: Record<TipoEvento, number> = { alquiler: 0, reserva: 0, devolucion: 0 }
    for (const evento of eventos) result[evento.tipo] += 1
    return result
  }, [eventos])

  const atrasados = useMemo(() => eventos.filter((e) => e.tipo === "devolucion" && e.atrasado).length, [eventos])

  const api = () => calendarRef.current?.getApi()

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setTitulo(arg.view.title)
    setVista(arg.view.type as Vista)
    setRango((actual) => {
      const desde = toISODate(arg.start)
      const hasta = toISODate(arg.end)
      return actual?.desde === desde && actual.hasta === hasta ? actual : { desde, hasta }
    })
  }, [])

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      info.jsEvent.preventDefault()
      const { href } = info.event.extendedProps as ExtendedProps
      router.push(href)
    },
    [router]
  )

  const handleEventDidMount = useCallback((info: EventMountArg) => {
    const { resumen } = info.event.extendedProps as ExtendedProps
    info.el.title = [info.event.title, resumen].filter(Boolean).join(" — ")
  }, [])

  return (
    <div className="calendario-zqui flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => api()?.prev()} aria-label="Período anterior">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => api()?.next()} aria-label="Período siguiente">
            <ChevronRight />
          </Button>
          <Button variant="outline" size="sm" onClick={() => api()?.today()}>
            Hoy
          </Button>
          <h2 className="ml-1 truncate text-lg font-semibold first-letter:uppercase">{titulo}</h2>
          {isFetching && <Spinner className="text-muted-foreground" />}
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          value={vista}
          onValueChange={(value) => value && api()?.changeView(value)}
          aria-label="Vista del calendario"
        >
          {VISTAS.map((v) => (
            <ToggleGroupItem key={v.value} value={v.value} className="px-3">
              {v.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TIPOS.map(({ tipo, label, color, icon: Icon }) => {
          const activo = visibles[tipo]
          return (
            <button
              key={tipo}
              type="button"
              aria-pressed={activo}
              onClick={() => setVisibles((actual) => ({ ...actual, [tipo]: !actual[tipo] }))}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                activo ? "bg-card text-foreground hover:bg-muted" : "bg-transparent text-muted-foreground line-through opacity-60"
              )}
            >
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />
              <Icon className="size-3.5" aria-hidden />
              {label}
              <span className="rounded-full bg-muted px-1.5 text-[11px] tabular">{conteo[tipo]}</span>
            </button>
          )
        })}
        <span className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: "var(--ev-atrasado)" }} />
            Atrasado{atrasados > 0 ? ` (${atrasados})` : ""}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-4 rounded-sm border border-dashed border-current" />
            Reserva pendiente
          </span>
        </span>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>No se pudieron cargar los eventos del calendario. Intentá nuevamente.</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden p-0">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, listPlugin]}
          locale={esLocale}
          initialView={vistaDeInicio}
          headerToolbar={false}
          height="auto"
          fixedWeekCount={false}
          dayMaxEvents={true}
          events={events}
          eventContent={renderEventContent}
          eventClick={handleEventClick}
          eventDidMount={handleEventDidMount}
          datesSet={handleDatesSet}
          noEventsContent="No hay alquileres, reservas ni devoluciones en este período."
          eventDisplay="block"
          displayEventTime={false}
        />
      </Card>
    </div>
  )
}
