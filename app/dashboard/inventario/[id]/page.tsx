import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"

import { DisfrazDetail } from "@/components/inventario/disfraz-detail"

export const metadata: Metadata = { title: "Disfraz" }

export default async function DisfrazPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  return <DisfrazDetail id={id} />
}
