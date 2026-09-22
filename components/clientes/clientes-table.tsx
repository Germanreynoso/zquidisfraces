"use client"

import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"

import { ClienteRowActions } from "@/components/clientes/cliente-actions"
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
import { useClientes } from "@/hooks/use-clientes"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ClienteVista } from "@/types/domain"

const CUENTA_OPTIONS: FacetOption[] = [
  { value: "activos", label: "Con alquileres activos", tone: "info" },
  { value: "vencidos", label: "Con vencidos", tone: "danger" },
  { value: "saldo", label: "Con saldo pendiente", tone: "warning" },
]

const ESTADO_OPTIONS: FacetOption[] = [
  { value: "activos", label: "Activos", tone: "success" },
  { value: "inactivos", label: "Dados de baja", tone: "neutral" },
]

const INITIAL_FILTERS = { estado: ["activos"] }

const columns: ColumnDef<ClienteVista>[] = [
  {
    accessorKey: "apellido",
    meta: { label: "Cliente" },
    enableHiding: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="max-w-56 truncate font-medium">{row.original.nombre_completo}</span>
          {!row.original.activo && <StatusBadge tone="neutral">Baja</StatusBadge>}
        </div>
        <div className="text-xs text-muted-foreground tabular">DNI {row.original.dni}</div>
      </div>
    ),
  },
  {
    id: "contacto",
    meta: { label: "Contacto" },
    enableSorting: false,
    header: "Contacto",
    cell: ({ row }) => (
      <div className="min-w-0 text-sm">
        <div className="max-w-48 truncate">{row.original.telefono ?? "—"}</div>
        {row.original.email && (
          <div className="max-w-48 truncate text-xs text-muted-foreground">{row.original.email}</div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "total_alquileres",
    meta: { label: "Alquileres" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Alquileres" />,
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium tabular">{row.original.total_alquileres}</span>
        {row.original.alquileres_activos > 0 && (
          <StatusBadge tone="info">
            {row.original.alquileres_activos} activo{row.original.alquileres_activos === 1 ? "" : "s"}
          </StatusBadge>
        )}
        {row.original.alquileres_vencidos > 0 && (
          <StatusBadge tone="danger">
            {row.original.alquileres_vencidos} vencido{row.original.alquileres_vencidos === 1 ? "" : "s"}
          </StatusBadge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "saldo_pendiente_total",
    meta: { label: "Saldo pendiente" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Saldo" align="right" />,
    cell: ({ row }) => (
      <div
        className={cn(
          "text-right tabular",
          row.original.saldo_pendiente_total > 0 ? "font-medium text-amber-700 dark:text-amber-300" : "text-muted-foreground"
        )}
      >
        {formatCurrency(row.original.saldo_pendiente_total)}
      </div>
    ),
  },
  {
    accessorKey: "ultimo_alquiler",
    meta: { label: "Último alquiler" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Último alquiler" />,
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.ultimo_alquiler)}</span>,
  },
  {
    id: "acciones",
    size: 48,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <ClienteRowActions cliente={row.original} />,
  },
]

export function ClientesTable() {
  const router = useRouter()
  const state = useDataTableState({ defaultSort: { id: "apellido", desc: false }, initialFilters: INITIAL_FILTERS })
  const { data, isLoading, isFetching } = useClientes(state.params)

  return (
    <DataTable
      columns={columns}
      data={data?.rows ?? []}
      rowCount={data?.total ?? 0}
      state={state}
      isLoading={isLoading}
      isFetching={isFetching}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/dashboard/clientes/${row.id}`)}
      empty={{ title: "No hay clientes", description: "Registrá tu primer cliente o cambiá los filtros." }}
      toolbar={(table) => (
        <DataTableToolbar
          state={state}
          searchPlaceholder="Buscar por nombre, DNI, teléfono o email…"
          actions={<DataTableViewOptions table={table} />}
        >
          <DataTableFacetedFilter
            title="Estado de cuenta"
            options={CUENTA_OPTIONS}
            value={state.filters.cuenta ?? []}
            onChange={(values) => state.setFilter("cuenta", values)}
            searchable={false}
          />
          <DataTableFacetedFilter
            title="Estado"
            options={ESTADO_OPTIONS}
            value={state.filters.estado ?? []}
            onChange={(values) => state.setFilter("estado", values)}
            searchable={false}
          />
        </DataTableToolbar>
      )}
    />
  )
}
