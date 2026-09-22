"use client"

import type { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props<TData, TValue> = {
  column: Column<TData, TValue>
  title: string
  className?: string
  align?: "left" | "right"
}

/** Encabezado ordenable: alterna ascendente/descendente al hacer clic. */
export function DataTableColumnHeader<TData, TValue>({ column, title, className, align = "left" }: Props<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(align === "right" && "text-right", className)}>{title}</div>
  }

  const sorted = column.getIsSorted()
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown

  return (
    <div className={cn("flex", align === "right" && "justify-end", className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "-mx-2 h-7 gap-1 px-2 text-xs font-medium tracking-wide uppercase",
          sorted ? "text-foreground" : "text-muted-foreground"
        )}
        onClick={() => column.toggleSorting(sorted === "asc")}
      >
        {title}
        <Icon className={cn("size-3.5", !sorted && "opacity-50")} />
      </Button>
    </div>
  )
}
