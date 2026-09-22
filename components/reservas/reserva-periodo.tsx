import { daysBetween, formatDate, todayISO } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { EstadoReserva } from "@/types/domain"

export function esReservaVigente(estado: EstadoReserva): boolean {
  return estado === "pendiente" || estado === "confirmada"
}

/** Texto relativo del período ("Empieza hoy", "Empieza en 3 días", "En curso", "Finalizó"). */
export function periodoRelativo(fechaInicio: string, fechaFin: string, hoy = todayISO()): string {
  if (fechaFin < hoy) return "Finalizó"
  if (fechaInicio <= hoy) return fechaInicio === hoy ? "Empieza hoy" : "En curso"
  const dias = daysBetween(hoy, fechaInicio)
  return dias === 1 ? "Empieza mañana" : `Empieza en ${dias} días`
}

export function duracionDias(fechaInicio: string, fechaFin: string): number {
  return daysBetween(fechaInicio, fechaFin) + 1
}

type Props = {
  fechaInicio: string
  fechaFin: string
  estado: EstadoReserva
  className?: string
}

/** Período de una reserva con indicación relativa (solo para reservas vigentes). */
export function ReservaPeriodo({ fechaInicio, fechaFin, estado, className }: Props) {
  const hoy = todayISO()
  const relativo = esReservaVigente(estado) ? periodoRelativo(fechaInicio, fechaFin, hoy) : null
  const pronto = relativo !== null && fechaInicio >= hoy && daysBetween(hoy, fechaInicio) <= 1

  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-sm whitespace-nowrap tabular">
        {formatDate(fechaInicio)} <span className="text-muted-foreground">→</span> {formatDate(fechaFin)}
      </div>
      {relativo && (
        <div className={cn("text-xs", pronto ? "font-medium text-primary" : "text-muted-foreground")}>{relativo}</div>
      )}
    </div>
  )
}
