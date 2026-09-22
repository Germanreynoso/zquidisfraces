import type { Metadata } from "next"

import { DevolucionesView } from "@/components/devoluciones/devoluciones-view"

export const metadata: Metadata = { title: "Devoluciones" }

export default function DevolucionesPage() {
  return <DevolucionesView />
}
