import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"

import { ClienteDetail } from "@/components/clientes/cliente-detail"

export const metadata: Metadata = { title: "Cliente" }

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  return <ClienteDetail id={id} />
}
