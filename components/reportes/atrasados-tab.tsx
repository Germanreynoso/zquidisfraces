"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { StatusBadge } from "@/components/status-badge"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useReporteAtrasados } from "@/hooks/use-reportes"
import { formatCurrency, formatDate, todayISO } from "@/lib/format"

import { ExportButtons } from "./export-buttons"
import { ReportEmpty, ReportError, ReportLoading, ReportSection } from "./report-section"

export function AtrasadosTab() {
  const { data = [], isLoading, error } = useReporteAtrasados()
  const hoy = todayISO()
  const saldoTotal = data.reduce((acc, a) => acc + Number(a.saldo_pendiente), 0)

  return (
    <ReportSection
      title="Alquileres atrasados"
      description="Alquileres activos con la fecha de devolución vencida (foto actual)."
      actions={<ExportButtons tipo="atrasados" desde={hoy} hasta={hoy} />}
    >
      {error ? (
        <ReportError />
      ) : isLoading ? (
        <ReportLoading />
      ) : data.length === 0 ? (
        <ReportEmpty title="No hay alquileres atrasados" description="Todas las devoluciones están al día." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Debía devolver</TableHead>
                <TableHead>Atraso</TableHead>
                <TableHead>Disfraces</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link href={`/dashboard/clientes/${a.cliente_id}`} className="font-medium hover:underline">
                      {a.cliente_nombre_completo}
                    </Link>
                    <div className="text-xs text-muted-foreground">DNI {a.cliente_dni}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{a.cliente_telefono ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(a.fecha_devolucion)}</TableCell>
                  <TableCell>
                    <StatusBadge tone="danger">
                      {a.dias_atraso} día{a.dias_atraso === 1 ? "" : "s"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="max-w-72 truncate text-muted-foreground" title={a.resumen_items ?? undefined}>
                    {a.resumen_items ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular">{formatCurrency(a.saldo_pendiente)}</TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/alquileres/${a.id}`}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Ver alquiler de ${a.cliente_nombre_completo}`}
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="font-semibold">
                  {data.length} alquiler{data.length === 1 ? "" : "es"} atrasado{data.length === 1 ? "" : "s"}
                </TableCell>
                <TableCell className="text-right font-semibold tabular">{formatCurrency(saldoTotal)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </ReportSection>
  )
}
