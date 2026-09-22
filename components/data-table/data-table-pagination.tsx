"use client"

import type { Table } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PAGE_SIZE_OPTIONS } from "@/lib/constants"
import { formatNumber } from "@/lib/format"

export function DataTablePagination<TData>({ table, rowCount }: { table: Table<TData>; rowCount: number }) {
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = Math.max(table.getPageCount(), 1)
  const from = rowCount === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, rowCount)

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-3 px-1 text-sm sm:flex-row">
      <p className="text-muted-foreground tabular">
        {rowCount === 0
          ? "Sin registros"
          : `Mostrando ${formatNumber(from)}–${formatNumber(to)} de ${formatNumber(rowCount)}`}
      </p>
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-muted-foreground">Filas</span>
          <Select value={String(pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}>
            <SelectTrigger size="sm" className="w-[4.5rem]" aria-label="Filas por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-muted-foreground tabular">
          Página {pageIndex + 1} de {pageCount}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden sm:inline-flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Primera página"
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Página anterior"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Página siguiente"
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden sm:inline-flex"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Última página"
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
