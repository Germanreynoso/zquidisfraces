"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Receipt,
  UserCheck,
  UserX,
  Wallet,
  ClipboardList,
  Clock,
} from "lucide-react"

import { CambiarEstadoClienteDialog } from "@/components/clientes/cliente-actions"
import { ClienteFormDialog } from "@/components/clientes/cliente-form-dialog"
import { ClienteAlquileresTable, ClienteReservasTable } from "@/components/clientes/cliente-historial"
import { useSession } from "@/components/session-provider"
import { StatCard } from "@/components/stat-card"
import { StatusBadge } from "@/components/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAlquileresCliente, useCliente, useReservasCliente } from "@/hooks/use-clientes"
import { formatCurrency, formatDate } from "@/lib/format"

export function ClienteDetail({ id }: { id: string }) {
  const { isAdmin } = useSession()
  const { data: cliente, isLoading, error } = useCliente(id)
  const alquileres = useAlquileresCliente(id)
  const reservas = useReservasCliente(id)
  const [dialogo, setDialogo] = useState<"editar" | "estado" | null>(null)

  const grupos = useMemo(() => {
    const todos = alquileres.data ?? []
    return {
      todos,
      activos: todos.filter((a) => a.estado_efectivo === "activo"),
      vencidos: todos.filter((a) => a.estado_efectivo === "atrasado"),
    }
  }, [alquileres.data])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (error || !cliente) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se encontró el cliente</AlertTitle>
        <AlertDescription>
          Puede haber sido eliminado. <Link href="/dashboard/clientes">Volver a clientes</Link>
        </AlertDescription>
      </Alert>
    )
  }

  const reservasVigentes = (reservas.data ?? []).filter((r) => r.estado === "pendiente" || r.estado === "confirmada")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0">
            <Link href="/dashboard/clientes" aria-label="Volver a clientes">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{cliente.nombre_completo}</h1>
              {cliente.activo ? (
                <StatusBadge tone="success">Activo</StatusBadge>
              ) : (
                <StatusBadge tone="neutral">Dado de baja</StatusBadge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <span className="tabular">DNI {cliente.dni}</span>
              <span>·</span>
              <span>Cliente desde {formatDate(cliente.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {cliente.activo && (
            <>
              <Button asChild>
                <Link href={`/dashboard/alquileres/nuevo?cliente=${cliente.id}`}>
                  <Receipt />
                  Nuevo alquiler
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/reservas/nueva?cliente=${cliente.id}`}>
                  <CalendarPlus />
                  Nueva reserva
                </Link>
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setDialogo("editar")}>
            <Pencil />
            Editar
          </Button>
          {isAdmin &&
            (cliente.activo ? (
              <Button variant="destructive" onClick={() => setDialogo("estado")}>
                <UserX />
                Dar de baja
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setDialogo("estado")}>
                <UserCheck />
                Reactivar
              </Button>
            ))}
        </div>
      </div>

      {cliente.alquileres_vencidos > 0 && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>
            Tiene {cliente.alquileres_vencidos} alquiler{cliente.alquileres_vencidos === 1 ? "" : "es"} con devolución vencida
          </AlertTitle>
          <AlertDescription>Contactalo para coordinar la devolución antes de registrar un nuevo alquiler.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Alquileres" value={cliente.total_alquileres} icon={ClipboardList} tone="violet" hint="Sin contar cancelados" />
        <StatCard label="Activos" value={cliente.alquileres_activos} icon={Clock} tone="info" hint="En curso y en término" />
        <StatCard
          label="Vencidos"
          value={cliente.alquileres_vencidos}
          icon={AlertTriangle}
          tone={cliente.alquileres_vencidos > 0 ? "danger" : "neutral"}
          hint="Devolución fuera de término"
        />
        <StatCard
          label="Saldo pendiente"
          value={formatCurrency(cliente.saldo_pendiente_total)}
          icon={Wallet}
          tone={cliente.saldo_pendiente_total > 0 ? "warning" : "success"}
          hint={cliente.ultimo_alquiler ? `Último alquiler: ${formatDate(cliente.ultimo_alquiler)}` : "Sin alquileres"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ContactRow icon={Phone} label="Teléfono">
              {cliente.telefono ? (
                <a href={`tel:${cliente.telefono}`} className="underline-offset-2 hover:underline">
                  {cliente.telefono}
                </a>
              ) : null}
            </ContactRow>
            <ContactRow icon={Mail} label="Email">
              {cliente.email ? (
                <a href={`mailto:${cliente.email}`} className="break-all underline-offset-2 hover:underline">
                  {cliente.email}
                </a>
              ) : null}
            </ContactRow>
            <ContactRow icon={MapPin} label="Dirección">
              {cliente.direccion}
            </ContactRow>
            {cliente.notas && (
              <div className="border-t pt-3">
                <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Notas</p>
                <p className="whitespace-pre-line text-muted-foreground">{cliente.notas}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <Tabs defaultValue={grupos.vencidos.length > 0 ? "vencidos" : "activos"} className="gap-0">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Alquileres y reservas</CardTitle>
              <TabsList className="w-full overflow-x-auto sm:w-auto">
                <TabsTrigger value="activos">
                  Activos
                  <CountBadge value={grupos.activos.length} />
                </TabsTrigger>
                <TabsTrigger value="vencidos">
                  Vencidos
                  <CountBadge value={grupos.vencidos.length} danger />
                </TabsTrigger>
                <TabsTrigger value="historial">
                  Historial
                  <CountBadge value={grupos.todos.length} />
                </TabsTrigger>
                <TabsTrigger value="reservas">
                  Reservas
                  <CountBadge value={reservasVigentes.length} />
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="activos">
                <ClienteAlquileresTable
                  alquileres={grupos.activos}
                  isLoading={alquileres.isLoading}
                  emptyMessage="No tiene alquileres activos en término."
                />
              </TabsContent>
              <TabsContent value="vencidos">
                <ClienteAlquileresTable
                  alquileres={grupos.vencidos}
                  isLoading={alquileres.isLoading}
                  emptyMessage="No tiene devoluciones vencidas."
                />
              </TabsContent>
              <TabsContent value="historial">
                <ClienteAlquileresTable
                  alquileres={grupos.todos}
                  isLoading={alquileres.isLoading}
                  emptyMessage="Todavía no registró alquileres."
                />
              </TabsContent>
              <TabsContent value="reservas">
                <ClienteReservasTable reservas={reservas.data ?? []} isLoading={reservas.isLoading} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      <ClienteFormDialog
        open={dialogo === "editar"}
        onOpenChange={(open) => setDialogo(open ? "editar" : null)}
        cliente={cliente}
      />
      {isAdmin && (
        <CambiarEstadoClienteDialog
          cliente={cliente}
          open={dialogo === "estado"}
          onOpenChange={(open) => setDialogo(open ? "estado" : null)}
        />
      )}
    </div>
  )
}

function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="min-w-0">{children || <span className="text-muted-foreground">—</span>}</div>
      </div>
    </div>
  )
}

function CountBadge({ value, danger }: { value: number; danger?: boolean }) {
  if (value === 0) return null
  return (
    <Badge
      variant="secondary"
      className={
        danger
          ? "ml-1 h-5 min-w-5 rounded-full bg-rose-500/15 px-1.5 text-rose-700 tabular dark:text-rose-300"
          : "ml-1 h-5 min-w-5 rounded-full px-1.5 tabular"
      }
    >
      {value}
    </Badge>
  )
}
