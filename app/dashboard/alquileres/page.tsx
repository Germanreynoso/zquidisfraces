import type { Metadata } from "next"

import { AlquileresView } from "@/components/alquileres/alquileres-view"

export const metadata: Metadata = { title: "Alquileres" }

export default function AlquileresPage() {
  return <AlquileresView />
}
