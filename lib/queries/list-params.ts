/** Parámetros de listados con paginación, orden, búsqueda y filtros resueltos en el servidor. */
export type SortParam = { id: string; desc: boolean }

export type ListParams = {
  page: number // 0-based
  pageSize: number
  sort?: SortParam
  search?: string
  filters?: Record<string, string[]>
}

export type Paginated<T> = { rows: T[]; total: number }

export function pageRange(page: number, pageSize: number): [from: number, to: number] {
  const from = page * pageSize
  return [from, from + pageSize - 1]
}

/**
 * Normaliza el texto de búsqueda para usarlo dentro de filtros `or()` de PostgREST:
 * se quitan caracteres con significado sintáctico (, ( ) " \) y comodines de LIKE (% _).
 */
export function sanitizeSearch(value: string | undefined): string {
  return (value ?? "")
    .replace(/[%_,()"\\*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
}

/** Construye `col1.ilike.*texto*,col2.ilike.*texto*` para `.or()`. */
export function ilikeAny(columns: string[], search: string): string {
  return columns.map((column) => `${column}.ilike.*${search}*`).join(",")
}

export function firstFilter(params: ListParams, key: string): string[] | undefined {
  const values = params.filters?.[key]
  return values && values.length > 0 ? values : undefined
}
