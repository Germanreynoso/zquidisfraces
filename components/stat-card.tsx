import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { Tone } from "@/lib/constants"
import { cn } from "@/lib/utils"

const ICON_TONE: Record<Tone, string> = {
  success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
  info: "bg-sky-500/12 text-sky-600 dark:text-sky-300",
  violet: "bg-primary/12 text-primary",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  danger: "bg-rose-500/12 text-rose-600 dark:text-rose-300",
  neutral: "bg-muted text-muted-foreground",
}

type StatCardProps = {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon: LucideIcon
  tone?: Tone
  href?: string
  loading?: boolean
}

export function StatCard({ label, value, hint, icon: Icon, tone = "violet", href, loading }: StatCardProps) {
  const content = (
    <Card
      className={cn(
        "gap-3 p-4 transition-colors",
        href && "hover:border-primary/40 hover:bg-accent/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", ICON_TONE[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <div className="font-heading text-3xl font-semibold tracking-tight tabular">{value}</div>
      )}
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </Card>
  )

  return href ? (
    <Link href={href} className="rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {content}
    </Link>
  ) : (
    content
  )
}
