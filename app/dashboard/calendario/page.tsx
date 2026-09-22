import type { Metadata } from "next"

import { CalendarioView } from "@/components/calendario/calendario-view"
import { PageHeader } from "@/components/page-header"

export const metadata: Metadata = { title: "Calendario" }

export default function CalendarioPage() {
  return (
    <>
      <PageHeader
        title="Calendario"
        description="Alquileres activos, reservas y devoluciones programadas. Hacé clic en un evento para ver el detalle."
      />
      <CalendarioView />
    </>
  )
}
