"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

import { AlquileresTable } from "@/components/alquileres/alquileres-table"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"

export function AlquileresView() {
  return (
    <>
      <PageHeader
        title="Alquileres"
        description="Alquileres activos, atrasados y su historial de cobros."
        actions={
          <Button asChild>
            <Link href="/dashboard/alquileres/nuevo">
              <Plus />
              Nuevo alquiler
            </Link>
          </Button>
        }
      />
      <AlquileresTable />
    </>
  )
}
