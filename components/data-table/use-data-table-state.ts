"use client"

import { useCallback, useMemo, useState } from "react"
import type { OnChangeFn, PaginationState, SortingState } from "@tanstack/react-table"
import { useDebounce } from "use-debounce"

import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import type { ListParams } from "@/lib/queries/list-params"

type Options = {
  defaultSort?: { id: string; desc: boolean }
  pageSize?: number
  initialFilters?: Record<string, string[]>
  /** Filtros a los que vuelve "Limpiar" (por defecto, los iniciales). */
  resetTo?: Record<string, string[]>
}

/**
 * Estado de una tabla server-side (paginación, orden, búsqueda con debounce y filtros)
 * y su traducción a ListParams. Cualquier cambio de criterio vuelve a la primera página.
 */
export function useDataTableState({ defaultSort, pageSize = DEFAULT_PAGE_SIZE, initialFilters, resetTo }: Options = {}) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize })
  const [sorting, setSortingState] = useState<SortingState>(defaultSort ? [defaultSort] : [])
  const [search, setSearchState] = useState("")
  const [debouncedSearch] = useDebounce(search.trim(), 300)
  const [filters, setFilters] = useState<Record<string, string[]>>(initialFilters ?? {})

  const resetPage = useCallback(() => setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 })), [])

  const setSorting: OnChangeFn<SortingState> = useCallback(
    (updater) => {
      setSortingState(updater)
      resetPage()
    },
    [resetPage]
  )

  const setSearch = useCallback(
    (value: string) => {
      setSearchState(value)
      resetPage()
    },
    [resetPage]
  )

  const setFilter = useCallback(
    (key: string, values: string[]) => {
      setFilters((current) => ({ ...current, [key]: values }))
      resetPage()
    },
    [resetPage]
  )

  const resetFilters = useCallback(() => {
    setFilters(resetTo ?? initialFilters ?? {})
    setSearchState("")
    resetPage()
  }, [resetTo, initialFilters, resetPage])

  // "Limpiar" solo tiene sentido si los filtros difieren de aquellos a los que vuelve.
  const activeFilters = search.length > 0 || !sameFilters(filters, resetTo ?? initialFilters ?? {})

  const params: ListParams = useMemo(
    () => ({
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sort: sorting[0] ? { id: sorting[0].id, desc: sorting[0].desc } : undefined,
      search: debouncedSearch || undefined,
      filters,
    }),
    [pagination, sorting, debouncedSearch, filters]
  )

  return {
    pagination,
    setPagination,
    sorting,
    setSorting,
    search,
    setSearch,
    filters,
    setFilter,
    resetFilters,
    activeFilters,
    params,
  }
}

export type DataTableState = ReturnType<typeof useDataTableState>

function sameFilters(a: Record<string, string[]>, b: Record<string, string[]>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    const left = [...(a[key] ?? [])].sort()
    const right = [...(b[key] ?? [])].sort()
    if (left.length !== right.length || left.some((value, index) => value !== right[index])) return false
  }
  return true
}
