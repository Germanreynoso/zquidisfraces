"use client"

import Link from "next/link"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useReporteClientesFrecuentes } from "@/hooks/use-reportes"
import { formatCurrency, formatDate, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import { ExportButtons } from "./export-buttons"
import { describirPeriodo, type Periodo } from "./periodo"
import { ReportEmpty, ReportError, ReportLoading, ReportSection } from "./report-section"

export function ClientesFrecuentesTab({ periodo }: { periodo: Periodo }) {
  const { data = [], isLoading, error } = useReporteClientesFrecuentes(periodo.desde, periodo.hasta)

  return (
    <ReportSection
      title="Clientes frecuentes"
      description={`Clientes con más alquileres iniciados entre el ${describirPeriodo(periodo)} (cancelados excluidos).`}
      actions={<ExportButtons tipo="clientes-frecuentes" desde={periodo.desde} hasta={periodo.hasta} />}
    >
      {error ? (
        <ReportError />
      ) : isLoading ? (
        <ReportLoading />
      ) : data.length === 0 ? (
        <ReportEmpty title="Sin alquileres en el período" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="text-right">Alquileres</TableHead>
                <TableHead className="text-right">Facturado</TableHead>
                <TableHead className="text-right">Pagado</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Último alquiler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((fila, index) => {
                const saldo = Number(fila.total_facturado) - Number(fila.total_pagado)
                return (
                  <TableRow key={fila.cliente_id}>
                    <TableCell className="text-muted-foreground tabular">{index + 1}</TableCell>
                    <TableCell>
                      <Link href={`/dashboard/clientes/${fila.cliente_id}`} className="font-medium hover:underline">
                        {fila.nombre_completo}
                      </Link>
                      <div className="text-xs text-muted-foreground">DNI {fila.dni}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{fila.telefono ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium tabular">{formatNumber(fila.cantidad_alquileres)}</TableCell>
                    <TableCell className="text-right tabular">{formatCurrency(fila.total_facturado)}</TableCell>
                    <TableCell className="text-right tabular">{formatCurrency(fila.total_pagado)}</TableCell>
                    <TableCell
                      className={cn("text-right tabular", saldo > 0 && "font-medium text-rose-700 dark:text-rose-300")}
                    >
                      {formatCurrency(saldo)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(fila.ultimo_alquiler)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </ReportSection>
  )
}
