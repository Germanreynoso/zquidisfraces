import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"

import { AlquilerDetail } from "@/components/alquileres/alquiler-detail"

export const metadata: Metadata = { title: "Alquiler" }

export default async function AlquilerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  return <AlquilerDetail id={id} />
}
