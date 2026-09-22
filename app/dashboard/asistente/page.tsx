import type { Metadata } from "next"

import { AsistenteView } from "@/components/asistente/asistente-view"

export const metadata: Metadata = { title: "Asistente" }

export default function AsistentePage() {
  return <AsistenteView />
}
