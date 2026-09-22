"use client"

import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import {
  DataTableFacetedFilter,
  DataTableToolbar,
  DataTableViewOptions,
} from "@/components/data-table/data-table-toolbar"
import { useDataTableState } from "@/components/data-table/use-data-table-state"
import { ReservaRowActions } from "@/components/reservas/reserva-actions"
import { ReservaPeriodo } from "@/components/reservas/reserva-periodo"
import { StatusBadge } from "@/components/status-badge"
import { useReservas } from "@/hooks/use-reservas"
import { ESTADO_RESERVA_LABEL, ESTADO_RESERVA_OPTIONS, ESTADO_RESERVA_TONE } from "@/lib/constants"
import { formatDate } from "@/lib/format"
import type { ReservaVista } from "@/types/domain"

const PERIODO_OPTIONS = [
  { value: "proximas", label: "Próximas y en curso" },
  { value: "pasadas", label: "Finalizadas" },
]

const FILTROS_INICIALES = { estado: ["pendiente", "confirmada"] }

const columns: ColumnDef<ReservaVista>[] = [
  {
    accessorKey: "cliente_nombre_completo",
    meta: { label: "Cliente" },
    enableHiding: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
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
    accessorKey: "fecha_inicio",
    meta: { label: "Período" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Período" />,
    cell: ({ row }) => (
      <ReservaPeriodo
        fechaInicio={row.original.fecha_inicio}
        fechaFin={row.original.fecha_fin}
        estado={row.original.estado}
      />
    ),
  },
  {
    accessorKey: "estado",
    meta: { label: "Estado" },
    enableSorting: false,
    header: "Estado",
    cell: ({ row }) => (
      <StatusBadge tone={ESTADO_RESERVA_TONE[row.original.estado]}>{ESTADO_RESERVA_LABEL[row.original.estado]}</StatusBadge>
    ),
  },
  {
    accessorKey: "created_at",
    meta: { label: "Creada" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Creada" />,
    cell: ({ row }) => (
      <span className="text-sm whitespace-nowrap text-muted-foreground">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
  {
    id: "acciones",
    size: 48,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <ReservaRowActions reserva={row.original} />,
  },
]

export function ReservasTable() {
  const router = useRouter()
  const state = useDataTableState({
    defaultSort: { id: "fecha_inicio", desc: false },
    initialFilters: FILTROS_INICIALES,
  })
  const { data, isLoading, isFetching } = useReservas(state.params)

  return (
    <DataTable
      columns={columns}
      data={data?.rows ?? []}
      rowCount={data?.total ?? 0}
      state={state}
      isLoading={isLoading}
      isFetching={isFetching}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/dashboard/reservas/${row.id}`)}
      initialColumnVisibility={{ created_at: false }}
      empty={{ title: "No hay reservas", description: "Registrá una reserva o cambiá los filtros." }}
      toolbar={(table) => (
        <DataTableToolbar
          state={state}
          searchPlaceholder="Buscar por cliente, DNI o disfraz…"
          actions={<DataTableViewOptions table={table} />}
        >
          <DataTableFacetedFilter
            title="Estado"
            options={ESTADO_RESERVA_OPTIONS}
            value={state.filters.estado ?? []}
            onChange={(values) => state.setFilter("estado", values)}
            searchable={false}
          />
          <DataTableFacetedFilter
            title="Período"
            options={PERIODO_OPTIONS}
            value={state.filters.periodo ?? []}
            onChange={(values) => state.setFilter("periodo", values)}
            searchable={false}
          />
        </DataTableToolbar>
      )}
    />
  )
}
