"use client"

import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { DataTableFacetedFilter, DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { useDataTableState } from "@/components/data-table/use-data-table-state"
import { StatusBadge } from "@/components/status-badge"
import { useMovimientos } from "@/hooks/use-disfraces"
import { TIPO_MOVIMIENTO_LABEL, type Tone } from "@/lib/constants"
import { formatDateTime } from "@/lib/format"
import type { MovimientoVista, TipoMovimiento } from "@/types/domain"

const TIPO_TONE: Record<TipoMovimiento, Tone> = {
  alta: "success",
  baja: "danger",
  alquiler: "info",
  devolucion: "success",
  a_mantenimiento: "warning",
  reparado: "success",
  extraviado: "danger",
  recuperado: "success",
  cancelacion_alquiler: "neutral",
  ajuste: "neutral",
}

const TIPO_OPTIONS = (Object.keys(TIPO_MOVIMIENTO_LABEL) as TipoMovimiento[]).map((tipo) => ({
  value: tipo,
  label: TIPO_MOVIMIENTO_LABEL[tipo],
  tone: TIPO_TONE[tipo],
}))

const columns: ColumnDef<MovimientoVista>[] = [
  {
    accessorKey: "created_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.created_at)}</span>,
  },
  {
    accessorKey: "disfraz_nombre",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Disfraz" />,
    cell: ({ row }) => (
      <Link href={`/dashboard/inventario/${row.original.disfraz_id}`} className="group block min-w-0">
        <div className="truncate font-medium group-hover:underline">
          {row.original.disfraz_nombre} <span className="font-normal text-muted-foreground">· {row.original.disfraz_talle}</span>
        </div>
        <div className="font-mono text-xs text-muted-foreground">{row.original.disfraz_codigo}</div>
      </Link>
    ),
  },
  {
    accessorKey: "tipo",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Movimiento" />,
    cell: ({ row }) => (
      <StatusBadge tone={TIPO_TONE[row.original.tipo]}>{TIPO_MOVIMIENTO_LABEL[row.original.tipo]}</StatusBadge>
    ),
  },
  {
    accessorKey: "cantidad",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cant." align="right" />,
    cell: ({ row }) => <div className="text-right font-medium tabular">{row.original.cantidad}</div>,
  },
  {
    accessorKey: "motivo",
    enableSorting: false,
    header: "Detalle",
    cell: ({ row }) => (
      <div className="max-w-72 text-sm">
        <div className="truncate">{row.original.motivo ?? "—"}</div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          {row.original.usuario_nombre && <span>{row.original.usuario_nombre}</span>}
          {row.original.alquiler_id && (
            <Link href={`/dashboard/alquileres/${row.original.alquiler_id}`} className="underline-offset-2 hover:underline">
              Ver alquiler
            </Link>
          )}
        </div>
      </div>
    ),
  },
]

export function MovimientosTable() {
  const state = useDataTableState({ defaultSort: { id: "created_at", desc: true }, pageSize: 20 })
  const { data, isLoading, isFetching } = useMovimientos(state.params)

  return (
    <DataTable
      columns={columns}
      data={data?.rows ?? []}
      rowCount={data?.total ?? 0}
      state={state}
      isLoading={isLoading}
      isFetching={isFetching}
      getRowId={(row) => row.id}
      empty={{ title: "Sin movimientos", description: "Todavía no se registraron cambios de stock." }}
      toolbar={() => (
        <DataTableToolbar state={state} searchPlaceholder="Buscar disfraz, código o motivo…">
          <DataTableFacetedFilter
            title="Movimiento"
            options={TIPO_OPTIONS}
            value={state.filters.tipo ?? []}
            onChange={(values) => state.setFilter("tipo", values)}
          />
        </DataTableToolbar>
      )}
    />
  )
}
