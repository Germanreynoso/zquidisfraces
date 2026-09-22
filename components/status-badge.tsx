import { cn } from "@/lib/utils"
import type { Tone } from "@/lib/constants"

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300 dark:ring-emerald-400/25",
  info: "bg-sky-500/10 text-sky-700 ring-sky-600/20 dark:text-sky-300 dark:ring-sky-400/25",
  violet: "bg-violet-500/10 text-violet-700 ring-violet-600/20 dark:text-violet-300 dark:ring-violet-400/25",
  warning: "bg-amber-500/12 text-amber-800 ring-amber-600/25 dark:text-amber-300 dark:ring-amber-400/25",
  danger: "bg-rose-500/10 text-rose-700 ring-rose-600/20 dark:text-rose-300 dark:ring-rose-400/25",
  neutral: "bg-muted text-muted-foreground ring-border",
}

export const TONE_DOT: Record<Tone, string> = {
  success: "bg-emerald-600",
  info: "bg-sky-600",
  violet: "bg-violet-600",
  warning: "bg-amber-600",
  danger: "bg-rose-600",
  neutral: "bg-muted-foreground/60",
}

type StatusBadgeProps = {
  tone?: Tone
  children: React.ReactNode
  dot?: boolean
  className?: string
}

/** Badge de estado con color semántico (legible en claro y oscuro). */
export function StatusBadge({ tone = "neutral", children, dot = true, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONE_CLASSES[tone],
        className
      )}
    >
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", TONE_DOT[tone])} />}
      {children}
    </span>
  )
}
