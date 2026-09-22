import type { Metadata } from "next"

import { ReservasView } from "@/components/reservas/reservas-view"

export const metadata: Metadata = { title: "Reservas" }

export default function ReservasPage() {
  return <ReservasView />
}
