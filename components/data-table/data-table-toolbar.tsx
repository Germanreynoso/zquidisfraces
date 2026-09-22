"use client"

import type { Table } from "@tanstack/react-table"
import { Check, PlusCircle, Search, Settings2, X } from "lucide-react"

import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import type { Tone } from "@/lib/constants"
import { cn } from "@/lib/utils"

import type { DataTableState } from "./use-data-table-state"

export type FacetOption = { value: string; label: string; tone?: Tone }

type ToolbarProps = {
  state: DataTableState
  searchPlaceholder?: string
  children?: React.ReactNode
  actions?: React.ReactNode
}

/** Barra de búsqueda + filtros (children) + acciones a la derecha. */
export function DataTableToolbar({ state, searchPlaceholder = "Buscar…", children, actions }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={state.search}
            onChange={(event) => state.setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Buscar"
          />
          {state.search && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" onClick={() => state.setSearch("")} aria-label="Limpiar búsqueda">
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        {children}
        {state.activeFilters && (
          <Button variant="ghost" size="sm" onClick={state.resetFilters}>
            Limpiar
            <X />
          </Button>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

type FacetedFilterProps = {
  title: string
  options: readonly FacetOption[]
  value: string[]
  onChange: (values: string[]) => void
  searchable?: boolean
}

/** Filtro multi-selección en popover (valores enviados al servidor). */
export function DataTableFacetedFilter({ title, options, value, onChange, searchable = true }: FacetedFilterProps) {
  const selected = new Set(value)

  const toggle = (optionValue: string) => {
    const next = new Set(selected)
    if (next.has(optionValue)) next.delete(optionValue)
    else next.add(optionValue)
    onChange([...next])
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle />
          {title}
          {selected.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {selected.size}
              </Badge>
              <div className="hidden gap-1 lg:flex">
                {selected.size > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selected.size} seleccionados
                  </Badge>
                ) : (
                  options
                    .filter((option) => selected.has(option.value))
                    .map((option) => (
                      <Badge variant="secondary" key={option.value} className="rounded-sm px-1 font-normal">
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          {searchable && <CommandInput placeholder={title} />}
          <CommandList>
            <CommandEmpty>Sin opciones.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.has(option.value)
                return (
                  <CommandItem key={option.value} onSelect={() => toggle(option.value)}>
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-[4px] border",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input"
                      )}
                    >
                      {isSelected && <Check className="size-3 text-current" />}
                    </span>
                    {option.tone ? <StatusBadge tone={option.tone}>{option.label}</StatusBadge> : option.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selected.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange([])} className="justify-center text-center">
                    Quitar filtro
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** Mostrar/ocultar columnas. */
export function DataTableViewOptions<TData>({ table }: { table: Table<TData> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="hidden h-8 lg:flex">
          <Settings2 />
          Columnas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Columnas visibles</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
            >
              {(column.columnDef.meta as { label?: string } | undefined)?.label ?? column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
