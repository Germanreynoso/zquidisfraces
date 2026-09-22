import type { Metadata } from "next"

import { MovimientosTable } from "@/components/inventario/movimientos-table"
import { PageHeader } from "@/components/page-header"

export const metadata: Metadata = { title: "Movimientos de stock" }

export default function MovimientosPage() {
  return (
    <>
      <PageHeader
        title="Movimientos de stock"
        description="Auditoría de cada alta, baja, alquiler, devolución y ajuste."
      />
      <MovimientosTable />
    </>
  )
}
