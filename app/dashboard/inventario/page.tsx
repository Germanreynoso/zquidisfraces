import type { Metadata } from "next"

import { InventarioView } from "@/components/inventario/inventario-view"
import { Constants } from "@/types/database.types"

export const metadata: Metadata = { title: "Inventario" }

const ESTADOS: readonly string[] = Constants.public.Enums.estado_disfraz

export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams
  // Permite enlazar al listado ya filtrado (p. ej. desde el dashboard).
  const initialFilters = estado && ESTADOS.includes(estado) ? { estado: [estado] } : undefined
  return <InventarioView initialFilters={initialFilters} />
}
