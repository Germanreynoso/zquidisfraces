"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { DisfracesTable } from "@/components/inventario/disfraces-table"
import { DisfrazFormSheet } from "@/components/inventario/disfraz-form-sheet"
import { PageHeader } from "@/components/page-header"
import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"

export function InventarioView() {
  const { isAdmin } = useSession()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Disfraces, talles y stock por estado."
        actions={
          isAdmin && (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              Nuevo disfraz
            </Button>
          )
        }
      />
      <DisfracesTable />
      {isAdmin && <DisfrazFormSheet open={creating} onOpenChange={setCreating} />}
    </>
  )
}
