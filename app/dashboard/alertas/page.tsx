import type { Metadata } from "next"

import { AlertasView } from "@/components/alertas/alertas-view"

export const metadata: Metadata = { title: "Alertas" }

export default function AlertasPage() {
  return <AlertasView />
}
