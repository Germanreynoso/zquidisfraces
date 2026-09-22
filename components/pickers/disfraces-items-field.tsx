"use client"

import { useState } from "react"
import { AlertTriangle, Minus, Plus, Search, Shirt, Trash2 } from "lucide-react"
import { useDebounce } from "use-debounce"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { useDisfrazOpciones, useDisponibilidad } from "@/hooks/use-disfraces"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { DisfrazVista } from "@/types/domain"

export type DisfrazSnapshot = Pick<
  DisfrazVista,
  "id" | "codigo" | "nombre" | "talle" | "precio_alquiler" | "cantidad_disponible" | "imagen_url"
>

export type ItemSeleccionado = { disfraz_id: string; cantidad: number; disfraz: DisfrazSnapshot }

type Modo = "alquiler" | "reserva"

type Props = {
  value: ItemSeleccionado[]
  onChange: (items: ItemSeleccionado[]) => void
  modo: Modo
  inicio?: string
  fin?: string
  /** Reserva a excluir del cálculo (al convertirla en alquiler). */
  excluirReservaId?: string | null
  invalid?: boolean
}

export function snapshotDisfraz(d: DisfrazVista): DisfrazSnapshot {
  return {
    id: d.id,
    codigo: d.codigo,
    nombre: d.nombre,
    talle: d.talle,
    precio_alquiler: d.precio_alquiler,
    cantidad_disponible: d.cantidad_disponible,
    imagen_url: d.imagen_url,
  }
}

export function totalItems(items: ItemSeleccionado[]): number {
  return items.reduce((sum, item) => sum + item.cantidad * item.disfraz.precio_alquiler, 0)
}

/**
 * Selector de disfraces con cantidades y disponibilidad para el rango de fechas elegido.
 * La validación definitiva la hace la base (con bloqueo de filas); acá se anticipa para el usuario.
 */
export function DisfracesItemsField({ value, onChange, modo, inicio, fin, excluirReservaId, invalid }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [debounced] = useDebounce(search, 250)
  const opciones = useDisfrazOpciones(debounced, open)
  const disponibilidad = useDisponibilidad(inicio, fin, excluirReservaId)
  const hasRange = Boolean(inicio && fin && fin >= inicio)

  /** Máximo que se puede pedir: en alquiler también limita el stock físico en local. */
  const maximo = (d: Pick<DisfrazSnapshot, "id" | "cantidad_disponible">): number | undefined => {
    const enRango = disponibilidad.data?.get(d.id)
    if (enRango === undefined) return modo === "alquiler" ? d.cantidad_disponible : undefined
    return Math.max(0, modo === "alquiler" ? Math.min(enRango, d.cantidad_disponible) : enRango)
  }

  const add = (d: DisfrazVista) => {
    const existing = value.find((item) => item.disfraz_id === d.id)
    if (existing) {
      onChange(value.map((item) => (item.disfraz_id === d.id ? { ...item, cantidad: item.cantidad + 1 } : item)))
    } else {
      onChange([...value, { disfraz_id: d.id, cantidad: 1, disfraz: snapshotDisfraz(d) }])
    }
    setOpen(false)
    setSearch("")
  }

  const setCantidad = (id: string, cantidad: number) =>
    onChange(value.map((item) => (item.disfraz_id === id ? { ...item, cantidad: Math.max(1, cantidad) } : item)))

  const remove = (id: string) => onChange(value.filter((item) => item.disfraz_id !== id))

  const total = totalItems(value)

  return (
    <div className={cn("rounded-xl border", invalid && "border-destructive ring-3 ring-destructive/20")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <div className="text-sm">
          <span className="font-medium">Disfraces</span>
          <span className="text-muted-foreground">
            {" · "}
            {hasRange ? "disponibilidad para las fechas elegidas" : "elegí las fechas para ver disponibilidad"}
          </span>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="secondary">
              <Plus />
              Agregar disfraz
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(26rem,calc(100vw-2rem))] p-0" align="end">
            <Command shouldFilter={false}>
              <CommandInput placeholder="Nombre, código o talle…" value={search} onValueChange={setSearch} />
              <CommandList>
                {opciones.isFetching && !opciones.data?.length ? (
                  <div className="flex justify-center py-6">
                    <Spinner />
                  </div>
                ) : (
                  <CommandEmpty>No se encontraron disfraces.</CommandEmpty>
                )}
                <CommandGroup>
                  {(opciones.data ?? []).map((d) => {
                    const max = maximo(d)
                    const agotado = max !== undefined && max <= 0
                    return (
                      <CommandItem key={d.id} value={d.id} onSelect={() => add(d)} disabled={agotado}>
                        <Thumb url={d.imagen_url} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {d.nombre} <span className="font-normal text-muted-foreground">· {d.talle}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {d.codigo}
                            {modo === "alquiler" && ` · ${formatCurrency(d.precio_alquiler)}`}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-1.5 py-0.5 text-xs tabular",
                            agotado ? "bg-rose-500/10 text-rose-600 dark:text-rose-300" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {max === undefined ? `${d.cantidad_total} u.` : agotado ? "Sin stock" : `${max} disp.`}
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {value.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
          <Search className="size-5" />
          Todavía no agregaste disfraces.
        </div>
      ) : (
        <ul className="divide-y">
          {value.map((item) => {
            const max = maximo(item.disfraz)
            const excede = max !== undefined && item.cantidad > max
            return (
              <li key={item.disfraz_id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                <Thumb url={item.disfraz.imagen_url} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {item.disfraz.nombre} <span className="font-normal text-muted-foreground">· {item.disfraz.talle}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.disfraz.codigo}
                    {max !== undefined && ` · ${max} disponible${max === 1 ? "" : "s"}`}
                  </div>
                  {excede && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="size-3.5" />
                      Supera lo disponible para esas fechas
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setCantidad(item.disfraz_id, item.cantidad - 1)}
                    disabled={item.cantidad <= 1}
                    aria-label="Restar"
                  >
                    <Minus />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={item.cantidad}
                    onChange={(e) => setCantidad(item.disfraz_id, Number(e.target.value) || 1)}
                    className="h-7 w-14 text-center tabular"
                    aria-label={`Cantidad de ${item.disfraz.nombre}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setCantidad(item.disfraz_id, item.cantidad + 1)}
                    aria-label="Sumar"
                  >
                    <Plus />
                  </Button>
                </div>
                {modo === "alquiler" && (
                  <div className="w-24 text-right text-sm font-medium tabular">
                    {formatCurrency(item.cantidad * item.disfraz.precio_alquiler)}
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(item.disfraz_id)}
                  aria-label={`Quitar ${item.disfraz.nombre}`}
                >
                  <Trash2 />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {modo === "alquiler" && value.length > 0 && (
        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Total del alquiler</span>
          <span className="font-heading text-lg font-semibold tabular">{formatCurrency(total)}</span>
        </div>
      )}
    </div>
  )
}

function Thumb({ url }: { url: string | null }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <Shirt className="size-4 text-muted-foreground" />
      )}
    </span>
  )
}
