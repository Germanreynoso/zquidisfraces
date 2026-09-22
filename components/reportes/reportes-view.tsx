"use client"

import { useState } from "react"

import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { REPORTES_SIN_PERIODO, type TipoReporte } from "@/lib/reportes/tipos"

import { AtrasadosTab } from "./atrasados-tab"
import { ClientesFrecuentesTab } from "./clientes-frecuentes-tab"
import { IngresosTab } from "./ingresos-tab"
import { InventarioTab } from "./inventario-tab"
import { MasAlquiladosTab } from "./mas-alquilados-tab"
import { periodoInicial, type Periodo } from "./periodo"
import { PeriodoSelector } from "./periodo-selector"

const TABS: { value: TipoReporte; label: string }[] = [
  { value: "ingresos", label: "Ingresos" },
  { value: "mas-alquilados", label: "Más alquilados" },
  { value: "clientes-frecuentes", label: "Clientes frecuentes" },
  { value: "inventario", label: "Inventario actual" },
  { value: "atrasados", label: "Atrasados" },
]

export function ReportesView() {
  const [periodo, setPeriodo] = useState<Periodo>(periodoInicial)
  const [tab, setTab] = useState<TipoReporte>("ingresos")
  const usaPeriodo = !REPORTES_SIN_PERIODO.includes(tab)

  return (
    <>
      <PageHeader title="Reportes" description="Ingresos, rotación de disfraces, clientes e inventario. Exportables a PDF y Excel." />

      <Tabs value={tab} onValueChange={(value) => setTab(value as TipoReporte)} className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="-mx-1 overflow-x-auto px-1">
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {usaPeriodo ? (
            <PeriodoSelector value={periodo} onChange={setPeriodo} />
          ) : (
            <p className="text-sm text-muted-foreground">Este reporte muestra la situación actual.</p>
          )}
        </div>

        <TabsContent value="ingresos">
          <IngresosTab periodo={periodo} />
        </TabsContent>
        <TabsContent value="mas-alquilados">
          <MasAlquiladosTab periodo={periodo} />
        </TabsContent>
        <TabsContent value="clientes-frecuentes">
          <ClientesFrecuentesTab periodo={periodo} />
        </TabsContent>
        <TabsContent value="inventario">
          <InventarioTab />
        </TabsContent>
        <TabsContent value="atrasados">
          <AtrasadosTab />
        </TabsContent>
      </Tabs>
    </>
  )
}
