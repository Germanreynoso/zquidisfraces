import { daysBetween, formatDate, todayISO } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { EstadoAlquiler } from "@/types/domain"

type Props = {
  estado: EstadoAlquiler
  fechaDevolucion: string
  fechaDevolucionReal?: string | null
  className?: string
}

/** Leyenda de vencimiento: "Vence hoy", "3 días de atraso", "Devuelto el …". */
export function Vencimiento({ estado, fechaDevolucion, fechaDevolucionReal, className }: Props) {
  if (estado === "devuelto") {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        Devuelto el {formatDate(fechaDevolucionReal ?? fechaDevolucion)}
      </span>
    )
  }
  if (estado === "cancelado") {
    return <span className={cn("text-xs text-muted-foreground", className)}>Cancelado</span>
  }

  const dias = daysBetween(todayISO(), fechaDevolucion)
  if (dias < 0) {
    const atraso = Math.abs(dias)
    return (
      <span className={cn("text-xs font-medium text-rose-600 dark:text-rose-400", className)}>
        {atraso} día{atraso === 1 ? "" : "s"} de atraso
      </span>
    )
  }
  if (dias === 0) {
    return <span className={cn("text-xs font-medium text-amber-700 dark:text-amber-300", className)}>Vence hoy</span>
  }
  if (dias === 1) {
    return <span className={cn("text-xs font-medium text-amber-700 dark:text-amber-300", className)}>Vence mañana</span>
  }
  return <span className={cn("text-xs text-muted-foreground", className)}>Vence en {dias} días</span>
}
