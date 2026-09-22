"use client"

import { DevolucionesPendientes } from "@/components/devoluciones/devoluciones-pendientes"
import { DevolucionesTable } from "@/components/devoluciones/devoluciones-table"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAlquileresPendientes } from "@/hooks/use-alquileres"

export function DevolucionesView() {
  const { data: pendientes } = useAlquileresPendientes()

  return (
    <>
      <PageHeader
        title="Devoluciones"
        description="Qué falta devolver y cómo volvieron los disfraces: daños, faltantes y cargos."
      />
      <Tabs defaultValue="pendientes" className="gap-4">
        <TabsList>
          <TabsTrigger value="pendientes">
            Pendientes
            {pendientes && pendientes.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 text-xs tabular">{pendientes.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="registradas">Registradas</TabsTrigger>
        </TabsList>
        <TabsContent value="pendientes">
          <DevolucionesPendientes />
        </TabsContent>
        <TabsContent value="registradas">
          <DevolucionesTable />
        </TabsContent>
      </Tabs>
    </>
  )
}
