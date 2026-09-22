"use client"

import { useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Table as TanstackTable,
  type VisibilityState,
} from "@tanstack/react-table"
import { SearchX } from "lucide-react"

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { DataTablePagination } from "./data-table-pagination"
import type { DataTableState } from "./use-data-table-state"

type DataTableProps<TData> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[]
  data: TData[]
  rowCount: number
  state: DataTableState
  isLoading?: boolean
  isFetching?: boolean
  toolbar?: (table: TanstackTable<TData>) => React.ReactNode
  onRowClick?: (row: TData) => void
  getRowId?: (row: TData) => string
  empty?: { title: string; description?: string }
  initialColumnVisibility?: VisibilityState
}

/**
 * Tabla con paginación, orden y filtros resueltos en el servidor (modo manual de TanStack Table).
 * El padre obtiene los datos con los ListParams de `state.params`.
 */
export function DataTable<TData>({
  columns,
  data,
  rowCount,
  state,
  isLoading,
  isFetching,
  toolbar,
  onRowClick,
  getRowId,
  empty = { title: "Sin resultados", description: "Probá con otros filtros o términos de búsqueda." },
  initialColumnVisibility,
}: DataTableProps<TData>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility ?? {})

  const table = useReactTable({
    data,
    columns,
    rowCount,
    getRowId,
    state: { pagination: state.pagination, sorting: state.sorting, columnVisibility },
    onPaginationChange: state.setPagination,
    onSortingChange: state.setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableSortingRemoval: false,
  })

  const visibleColumns = table.getVisibleLeafColumns().length

  return (
    <div className="flex flex-col gap-3">
      {toolbar?.(table)}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border bg-card transition-opacity",
          isFetching && !isLoading && "opacity-70"
        )}
      >
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.column.columnDef.size !== 150 ? header.column.columnDef.size : undefined }}
                    className="h-10 text-xs font-medium tracking-wide text-muted-foreground uppercase"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: Math.min(state.pagination.pageSize, 8) }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="hover:bg-transparent">
                  {Array.from({ length: visibleColumns }).map((__, cell) => (
                    <TableCell key={cell}>
                      <Skeleton className="h-5 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={visibleColumns} className="p-0">
                  <Empty className="border-0 py-12">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SearchX />
                      </EmptyMedia>
                      <EmptyTitle>{empty.title}</EmptyTitle>
                      {empty.description && <EmptyDescription>{empty.description}</EmptyDescription>}
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} rowCount={rowCount} />
    </div>
  )
}
