import type { Metadata } from "next"
import { Suspense } from "react"

import { PageHeader } from "@/components/page-header"
import { ReservaForm } from "@/components/reservas/reserva-form"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = { title: "Nueva reserva" }

export default function NuevaReservaPage() {
  return (
    <>
      <PageHeader
        title="Nueva reserva"
        description="Apartá disfraces para una fecha futura. El stock queda comprometido para ese período."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ReservaForm />
      </Suspense>
    </>
  )
}
