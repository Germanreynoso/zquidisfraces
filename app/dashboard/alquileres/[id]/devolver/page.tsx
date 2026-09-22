import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"

import { DevolucionForm } from "@/components/devoluciones/devolucion-form"

export const metadata: Metadata = { title: "Registrar devolución" }

export default async function DevolverAlquilerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  return <DevolucionForm id={id} />
}
