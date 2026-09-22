import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type StockBarProps = {
  total: number
  disponible: number
  alquilada: number
  mantenimiento: number
  extraviada: number
  className?: string
  showLabel?: boolean
}

const SEGMENTS = [
  { key: "disponible", label: "Disponibles", className: "bg-emerald-600" },
  { key: "alquilada", label: "Alquiladas", className: "bg-sky-600" },
  { key: "mantenimiento", label: "Mantenimiento", className: "bg-amber-600" },
  { key: "extraviada", label: "Extraviadas", className: "bg-rose-600" },
] as const

/** Barra segmentada del stock por estado. */
export function StockBar({ total, className, showLabel = true, ...counts }: StockBarProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex min-w-24 flex-col gap-1", className)}>
          {showLabel && (
            <span className="text-sm tabular">
              <span className="font-medium">{counts.disponible}</span>
              <span className="text-muted-foreground"> / {total}</span>
            </span>
          )}
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
            {total > 0 &&
              SEGMENTS.map((segment) => {
                const value = counts[segment.key]
                return value > 0 ? (
                  <span
                    key={segment.key}
                    className={segment.className}
                    style={{ width: `${(value / total) * 100}%` }}
                  />
                ) : null
              })}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <ul className="space-y-0.5 text-xs">
          {SEGMENTS.map((segment) => (
            <li key={segment.key} className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", segment.className)} />
              {segment.label}: <span className="font-medium tabular">{counts[segment.key]}</span>
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}
