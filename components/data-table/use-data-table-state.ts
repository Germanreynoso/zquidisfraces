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
}

/**
 * Estado de una tabla server-side (paginación, orden, búsqueda con debounce y filtros)
 * y su traducción a ListParams. Cualquier cambio de criterio vuelve a la primera página.
 */
export function useDataTableState({ defaultSort, pageSize = DEFAULT_PAGE_SIZE, initialFilters }: Options = {}) {
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
    setFilters(initialFilters ?? {})
    setSearchState("")
    resetPage()
  }, [initialFilters, resetPage])

  const activeFilters = Object.values(filters).some((values) => values.length > 0) || search.length > 0

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
