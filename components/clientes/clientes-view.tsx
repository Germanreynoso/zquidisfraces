"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserPlus } from "lucide-react"

import { ClienteFormDialog } from "@/components/clientes/cliente-form-dialog"
import { ClientesTable } from "@/components/clientes/clientes-table"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"

export function ClientesView() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Datos de contacto, historial de alquileres y saldos pendientes."
        actions={
          <Button onClick={() => setCreating(true)}>
            <UserPlus />
            Nuevo cliente
          </Button>
        }
      />
      <ClientesTable />
      <ClienteFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(cliente) => router.push(`/dashboard/clientes/${cliente.id}`)}
      />
    </>
  )
}
