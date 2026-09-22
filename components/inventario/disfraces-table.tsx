"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Shirt } from "lucide-react"

import { DataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import {
  DataTableFacetedFilter,
  DataTableToolbar,
  DataTableViewOptions,
} from "@/components/data-table/data-table-toolbar"
import { useDataTableState } from "@/components/data-table/use-data-table-state"
import { DisfrazRowActions } from "@/components/inventario/disfraz-actions"
import { StockBar } from "@/components/inventario/stock-bar"
import { StatusBadge } from "@/components/status-badge"
import { useDisfraces, useTalles } from "@/hooks/use-disfraces"
import {
  CATEGORIA_LABEL,
  CATEGORIA_OPTIONS,
  ESTADO_DISFRAZ_LABEL,
  ESTADO_DISFRAZ_OPTIONS,
  ESTADO_DISFRAZ_TONE,
} from "@/lib/constants"
import { formatCurrency } from "@/lib/format"
import type { DisfrazVista } from "@/types/domain"

const columns: ColumnDef<DisfrazVista>[] = [
  {
    id: "imagen",
    header: "",
    size: 56,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => (
      <span className="grid size-10 place-items-center overflow-hidden rounded-lg border bg-muted">
        {row.original.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.original.imagen_url} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <Shirt className="size-4 text-muted-foreground" />
        )}
      </span>
    ),
  },
  {
    accessorKey: "nombre",
    meta: { label: "Nombre" },
    enableHiding: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Disfraz" />,
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="max-w-64 truncate font-medium">{row.original.nombre}</div>
        <div className="font-mono text-xs text-muted-foreground">{row.original.codigo}</div>
      </div>
    ),
  },
  {
    accessorKey: "categoria",
    meta: { label: "Categoría" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Categoría" />,
    cell: ({ row }) => <span className="text-sm">{CATEGORIA_LABEL[row.original.categoria]}</span>,
  },
  {
    accessorKey: "talle",
    meta: { label: "Talle" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Talle" />,
  },
  {
    accessorKey: "cantidad_disponible",
    meta: { label: "Stock" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Disponible" />,
    cell: ({ row }) => (
      <StockBar
        total={row.original.cantidad_total}
        disponible={row.original.cantidad_disponible}
        alquilada={row.original.cantidad_alquilada}
        mantenimiento={row.original.cantidad_mantenimiento}
        extraviada={row.original.cantidad_extraviada}
      />
    ),
  },
  {
    accessorKey: "estado_efectivo",
    meta: { label: "Estado" },
    enableSorting: false,
    header: "Estado",
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
        <StatusBadge tone={ESTADO_DISFRAZ_TONE[row.original.estado_efectivo]}>
          {ESTADO_DISFRAZ_LABEL[row.original.estado_efectivo]}
        </StatusBadge>
        {row.original.stock_bajo && <span className="text-[11px] text-amber-700 dark:text-amber-300">Stock bajo</span>}
      </div>
    ),
  },
  {
    accessorKey: "precio_alquiler",
    meta: { label: "Precio" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Precio" align="right" />,
    cell: ({ row }) => <div className="text-right font-medium tabular">{formatCurrency(row.original.precio_alquiler)}</div>,
  },
  {
    id: "acciones",
    size: 48,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <DisfrazRowActions disfraz={row.original} />,
  },
]

const SIN_FILTROS: Record<string, string[]> = {}

export function DisfracesTable({ initialFilters }: { initialFilters?: Record<string, string[]> }) {
  const router = useRouter()
  const state = useDataTableState({ defaultSort: { id: "nombre", desc: false }, initialFilters, resetTo: SIN_FILTROS })
  const { data, isLoading, isFetching } = useDisfraces(state.params)
  const { data: talles = [] } = useTalles()
  const talleOptions = useMemo(() => talles.map((talle) => ({ value: talle, label: talle })), [talles])

  return (
    <DataTable
      columns={columns}
      data={data?.rows ?? []}
      rowCount={data?.total ?? 0}
      state={state}
      isLoading={isLoading}
      isFetching={isFetching}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/dashboard/inventario/${row.id}`)}
      empty={{ title: "No hay disfraces", description: "Cargá tu primer disfraz o cambiá los filtros." }}
      toolbar={(table) => (
        <DataTableToolbar
          state={state}
          searchPlaceholder="Buscar por nombre, código o talle…"
          actions={<DataTableViewOptions table={table} />}
        >
          <DataTableFacetedFilter
            title="Categoría"
            options={CATEGORIA_OPTIONS}
            value={state.filters.categoria ?? []}
            onChange={(values) => state.setFilter("categoria", values)}
          />
          <DataTableFacetedFilter
            title="Estado"
            options={ESTADO_DISFRAZ_OPTIONS}
            value={state.filters.estado ?? []}
            onChange={(values) => state.setFilter("estado", values)}
            searchable={false}
          />
          <DataTableFacetedFilter
            title="Talle"
            options={talleOptions}
            value={state.filters.talle ?? []}
            onChange={(values) => state.setFilter("talle", values)}
          />
          <DataTableFacetedFilter
            title="Stock"
            options={[{ value: "bajo", label: "Stock bajo", tone: "warning" }]}
            value={state.filters.stock ?? []}
            onChange={(values) => state.setFilter("stock", values)}
            searchable={false}
          />
        </DataTableToolbar>
      )}
    />
  )
}
