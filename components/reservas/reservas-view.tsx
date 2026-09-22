"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { ReservasTable } from "@/components/reservas/reservas-table"
import { Button } from "@/components/ui/button"

export function ReservasView() {
  return (
    <>
      <PageHeader
        title="Reservas"
        description="Disfraces apartados para fechas futuras, sin superposiciones de stock."
        actions={
          <Button asChild>
            <Link href="/dashboard/reservas/nueva">
              <Plus />
              Nueva reserva
            </Link>
          </Button>
        }
      />
      <ReservasTable />
    </>
  )
}
