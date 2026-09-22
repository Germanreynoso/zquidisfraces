"use client"

import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"

import { AlquilerRowActions } from "@/components/alquileres/alquiler-row-actions"
import { Vencimiento } from "@/components/alquileres/vencimiento"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import {
  DataTableFacetedFilter,
  DataTableToolbar,
  DataTableViewOptions,
  type FacetOption,
} from "@/components/data-table/data-table-toolbar"
import { useDataTableState } from "@/components/data-table/use-data-table-state"
import { StatusBadge } from "@/components/status-badge"
import { useAlquileres } from "@/hooks/use-alquileres"
import { ESTADO_ALQUILER_LABEL, ESTADO_ALQUILER_OPTIONS, ESTADO_ALQUILER_TONE } from "@/lib/constants"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AlquilerVista } from "@/types/domain"

const FILTROS_INICIALES = { estado: ["activo", "atrasado"] }

const VENCE_OPTIONS: FacetOption[] = [
  { value: "hoy", label: "Vencen hoy", tone: "warning" },
  { value: "semana", label: "Vencen esta semana", tone: "info" },
]

const columns: ColumnDef<AlquilerVista>[] = [
  {
    accessorKey: "cliente_nombre_completo",
    meta: { label: "Cliente" },
    enableSorting: false,
    enableHiding: false,
    header: "Cliente",
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="max-w-56 truncate font-medium">{row.original.cliente_nombre_completo}</div>
        <div className="text-xs text-muted-foreground">DNI {row.original.cliente_dni}</div>
      </div>
    ),
  },
  {
    accessorKey: "resumen_items",
    meta: { label: "Disfraces" },
    enableSorting: false,
    header: "Disfraces",
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="max-w-72 truncate text-sm" title={row.original.resumen_items ?? undefined}>
          {row.original.resumen_items ?? "—"}
        </div>
        <div className="text-xs text-muted-foreground">
          {row.original.cantidad_items} unidad{row.original.cantidad_items === 1 ? "" : "es"}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "fecha_alquiler",
    meta: { label: "Fecha de alquiler" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Alquiler" />,
    cell: ({ row }) => <span className="whitespace-nowrap text-sm tabular">{formatDate(row.original.fecha_alquiler)}</span>,
  },
  {
    accessorKey: "fecha_devolucion",
    meta: { label: "Devolución" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Devolución" />,
    cell: ({ row }) => (
      <div className="flex flex-col whitespace-nowrap">
        <span className="text-sm tabular">{formatDate(row.original.fecha_devolucion)}</span>
        <Vencimiento
          estado={row.original.estado}
          fechaDevolucion={row.original.fecha_devolucion}
          fechaDevolucionReal={row.original.fecha_devolucion_real}
        />
      </div>
    ),
  },
  {
    accessorKey: "estado_efectivo",
    meta: { label: "Estado" },
    enableSorting: false,
    header: "Estado",
    cell: ({ row }) => (
      <StatusBadge tone={ESTADO_ALQUILER_TONE[row.original.estado_efectivo]}>
        {ESTADO_ALQUILER_LABEL[row.original.estado_efectivo]}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "monto_total",
    meta: { label: "Total" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" align="right" />,
    cell: ({ row }) => (
      <div className="text-right font-medium tabular">
        {formatCurrency(row.original.monto_total + row.original.cargos_adicionales)}
      </div>
    ),
  },
  {
    accessorKey: "saldo_pendiente",
    meta: { label: "Saldo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Saldo" align="right" />,
    cell: ({ row }) => {
      const saldo = row.original.estado === "cancelado" ? 0 : row.original.saldo_pendiente
      return (
        <div
          className={cn(
            "text-right tabular",
            saldo > 0 ? "font-semibold text-amber-700 dark:text-amber-300" : "text-muted-foreground"
          )}
        >
          {formatCurrency(saldo)}
        </div>
      )
    },
  },
  {
    id: "acciones",
    size: 48,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <AlquilerRowActions alquiler={row.original} />,
  },
]

export function AlquileresTable() {
  const router = useRouter()
  const state = useDataTableState({
    defaultSort: { id: "fecha_devolucion", desc: false },
    initialFilters: FILTROS_INICIALES,
  })
  const { data, isLoading, isFetching } = useAlquileres(state.params)

  return (
    <DataTable
      columns={columns}
      data={data?.rows ?? []}
      rowCount={data?.total ?? 0}
      state={state}
      isLoading={isLoading}
      isFetching={isFetching}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/dashboard/alquileres/${row.id}`)}
      empty={{ title: "No hay alquileres", description: "Registrá un alquiler nuevo o cambiá los filtros." }}
      toolbar={(table) => (
        <DataTableToolbar
          state={state}
          searchPlaceholder="Buscar por cliente, DNI o disfraz…"
          actions={<DataTableViewOptions table={table} />}
        >
          <DataTableFacetedFilter
            title="Estado"
            options={ESTADO_ALQUILER_OPTIONS}
            value={state.filters.estado ?? []}
            onChange={(values) => state.setFilter("estado", values)}
            searchable={false}
          />
          <DataTableFacetedFilter
            title="Vencimiento"
            options={VENCE_OPTIONS}
            value={state.filters.vence ?? []}
            onChange={(values) => state.setFilter("vence", values.slice(-1))}
            searchable={false}
          />
        </DataTableToolbar>
      )}
    />
  )
}
