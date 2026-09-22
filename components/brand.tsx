import { VenetianMask } from "lucide-react"

import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-brand-2 text-primary-foreground shadow-sm shadow-primary/30",
        className
      )}
    >
      <VenetianMask className="size-[1.15rem]" strokeWidth={2.2} />
    </span>
  )
}

export function BrandName({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading text-base font-semibold tracking-tight", className)}>
      Ziqui<span className="text-primary">Disfraces</span>
    </span>
  )
}
