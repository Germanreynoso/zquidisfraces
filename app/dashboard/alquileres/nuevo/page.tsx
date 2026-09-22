import type { Metadata } from "next"
import { Suspense } from "react"

import { AlquilerForm } from "@/components/alquileres/alquiler-form"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = { title: "Nuevo alquiler" }

export default function NuevoAlquilerPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AlquilerForm />
    </Suspense>
  )
}
