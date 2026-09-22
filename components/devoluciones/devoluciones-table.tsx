"use client"

import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { DataTableFacetedFilter, DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { useDataTableState } from "@/components/data-table/use-data-table-state"
import { StatusBadge } from "@/components/status-badge"
import { useDevoluciones } from "@/hooks/use-devoluciones"
import { ESTADO_DEVOLUCION_LABEL, ESTADO_DEVOLUCION_OPTIONS, ESTADO_DEVOLUCION_TONE } from "@/lib/constants"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { DevolucionVista } from "@/types/domain"

const columns: ColumnDef<DevolucionVista>[] = [
  {
    accessorKey: "fecha_devolucion_real",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Devuelto" />,
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        <div className="text-sm tabular">{formatDate(row.original.fecha_devolucion_real)}</div>
        <div className="text-xs text-muted-foreground">Pactado {formatDate(row.original.fecha_devolucion_pactada)}</div>
      </div>
    ),
  },
  {
    accessorKey: "cliente_nombre_completo",
    enableSorting: false,
    header: "Cliente",
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="max-w-56 truncate font-medium">{row.original.cliente_nombre_completo}</div>
        <div className="text-xs text-muted-foreground">DNI {row.original.cliente_dni}</div>
      </div>
    ),
  },
  {
    accessorKey: "estado_disfraz",
    enableSorting: false,
    header: "Estado",
    cell: ({ row }) => (
      <StatusBadge tone={ESTADO_DEVOLUCION_TONE[row.original.estado_disfraz]}>
        {ESTADO_DEVOLUCION_LABEL[row.original.estado_disfraz]}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "dias_atraso",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Atraso" align="right" />,
    cell: ({ row }) => (
      <div
        className={cn(
          "text-right text-sm tabular",
          row.original.dias_atraso > 0 ? "font-medium text-rose-600 dark:text-rose-400" : "text-muted-foreground"
        )}
      >
        {row.original.dias_atraso > 0 ? `${row.original.dias_atraso} día${row.original.dias_atraso === 1 ? "" : "s"}` : "A tiempo"}
      </div>
    ),
  },
  {
    id: "unidades",
    enableSorting: false,
    header: () => <div className="text-right">Dañadas / faltantes</div>,
    cell: ({ row }) => (
      <div className="text-right text-sm tabular">
        <span className={cn(row.original.unidades_danadas > 0 && "text-amber-700 dark:text-amber-300")}>
          {row.original.unidades_danadas}
        </span>
        <span className="text-muted-foreground"> / </span>
        <span className={cn(row.original.unidades_faltantes > 0 && "text-rose-600 dark:text-rose-400")}>
          {row.original.unidades_faltantes}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "costo_reparacion",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cargos" align="right" />,
    cell: ({ row }) => {
      const cargos = row.original.costo_reparacion + row.original.costo_reposicion
      return (
        <div className={cn("text-right tabular", cargos > 0 ? "font-medium" : "text-muted-foreground")}>
          {formatCurrency(cargos)}
        </div>
      )
    },
  },
]

export function DevolucionesTable() {
  const router = useRouter()
  const state = useDataTableState({ defaultSort: { id: "fecha_devolucion_real", desc: true } })
  const { data, isLoading, isFetching } = useDevoluciones(state.params)

  return (
    <DataTable
      columns={columns}
      data={data?.rows ?? []}
      rowCount={data?.total ?? 0}
      state={state}
      isLoading={isLoading}
      isFetching={isFetching}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/dashboard/alquileres/${row.alquiler_id}`)}
      empty={{ title: "Sin devoluciones", description: "Todavía no se registraron devoluciones con esos filtros." }}
      toolbar={() => (
        <DataTableToolbar state={state} searchPlaceholder="Buscar por cliente o DNI…">
          <DataTableFacetedFilter
            title="Estado"
            options={ESTADO_DEVOLUCION_OPTIONS}
            value={state.filters.estado ?? []}
            onChange={(values) => state.setFilter("estado", values)}
            searchable={false}
          />
        </DataTableToolbar>
      )}
    />
  )
}
