import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"

import { ReservaDetail } from "@/components/reservas/reserva-detail"

export const metadata: Metadata = { title: "Reserva" }

export default async function ReservaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  return <ReservaDetail id={id} />
}
