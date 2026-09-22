"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, UserPlus } from "lucide-react"
import { useDebounce } from "use-debounce"

import { ClienteFormDialog } from "@/components/clientes/cliente-form-dialog"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { useClienteOpciones } from "@/hooks/use-clientes"
import { cn } from "@/lib/utils"

export type ClienteSeleccionado = { id: string; label: string; dni: string }

type ClientePickerProps = {
  value: ClienteSeleccionado | null
  onChange: (value: ClienteSeleccionado | null) => void
  id?: string
  invalid?: boolean
  disabled?: boolean
}

/** Combobox con búsqueda remota de clientes y alta rápida. */
export function ClientePicker({ value, onChange, id, invalid, disabled }: ClientePickerProps) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState("")
  const [debounced] = useDebounce(search, 250)
  const { data: opciones = [], isFetching } = useClienteOpciones(debounced, open)

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid}
            disabled={disabled}
            className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
          >
            <span className="truncate">{value ? `${value.label} · ${value.dni}` : "Buscar cliente por nombre o DNI…"}</span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Nombre, apellido o DNI…" value={search} onValueChange={setSearch} />
            <CommandList>
              {isFetching && opciones.length === 0 ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : (
                <CommandEmpty>No se encontraron clientes.</CommandEmpty>
              )}
              <CommandGroup>
                {opciones.map((cliente) => (
                  <CommandItem
                    key={cliente.id}
                    value={cliente.id}
                    onSelect={() => {
                      onChange({ id: cliente.id, label: cliente.nombre_completo, dni: cliente.dni })
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("size-4", value?.id === cliente.id ? "opacity-100" : "opacity-0")} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{cliente.nombre_completo}</div>
                      <div className="text-xs text-muted-foreground">
                        DNI {cliente.dni}
                        {cliente.telefono ? ` · ${cliente.telefono}` : ""}
                        {cliente.alquileres_vencidos > 0 && (
                          <span className="text-rose-600 dark:text-rose-400">
                            {" "}
                            · {cliente.alquileres_vencidos} vencido(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="__nuevo__"
                  onSelect={() => {
                    setOpen(false)
                    setCreating(true)
                  }}
                >
                  <UserPlus className="size-4" />
                  Nuevo cliente
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <ClienteFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(cliente) => onChange({ id: cliente.id, label: `${cliente.apellido}, ${cliente.nombre}`, dni: cliente.dni })}
      />
    </>
  )
}
