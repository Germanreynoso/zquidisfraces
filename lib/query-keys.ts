import type { QueryClient } from "@tanstack/react-query"

import type { ListParams } from "@/lib/queries/list-params"

/**
 * Claves de TanStack Query centralizadas. Cada módulo usa su raíz para invalidar en bloque.
 */
export const queryKeys = {
  session: ["session"] as const,
  dashboard: {
    root: ["dashboard"] as const,
    resumen: () => ["dashboard", "resumen"] as const,
    proximasDevoluciones: () => ["dashboard", "proximas-devoluciones"] as const,
  },
  disfraces: {
    root: ["disfraces"] as const,
    list: (params: ListParams) => ["disfraces", "list", params] as const,
    detail: (id: string) => ["disfraces", "detail", id] as const,
    movimientos: (id: string) => ["disfraces", "movimientos", id] as const,
    opciones: (search: string) => ["disfraces", "opciones", search] as const,
  },
  disponibilidad: {
    root: ["disponibilidad"] as const,
    rango: (inicio: string, fin: string, excluirReservaId?: string | null) =>
      ["disponibilidad", inicio, fin, excluirReservaId ?? null] as const,
  },
  clientes: {
    root: ["clientes"] as const,
    list: (params: ListParams) => ["clientes", "list", params] as const,
    detail: (id: string) => ["clientes", "detail", id] as const,
    alquileres: (id: string) => ["clientes", "alquileres", id] as const,
    opciones: (search: string) => ["clientes", "opciones", search] as const,
  },
  alquileres: {
    root: ["alquileres"] as const,
    list: (params: ListParams) => ["alquileres", "list", params] as const,
    detail: (id: string) => ["alquileres", "detail", id] as const,
  },
  devoluciones: {
    root: ["devoluciones"] as const,
    list: (params: ListParams) => ["devoluciones", "list", params] as const,
    detail: (id: string) => ["devoluciones", "detail", id] as const,
  },
  reservas: {
    root: ["reservas"] as const,
    list: (params: ListParams) => ["reservas", "list", params] as const,
    detail: (id: string) => ["reservas", "detail", id] as const,
  },
  calendario: {
    root: ["calendario"] as const,
    eventos: (desde: string, hasta: string) => ["calendario", desde, hasta] as const,
  },
  alertas: {
    root: ["alertas"] as const,
    list: () => ["alertas", "list"] as const,
  },
  reportes: {
    root: ["reportes"] as const,
    ingresos: (desde: string, hasta: string, agrupacion: string) =>
      ["reportes", "ingresos", desde, hasta, agrupacion] as const,
    masAlquilados: (desde: string, hasta: string) => ["reportes", "mas-alquilados", desde, hasta] as const,
    clientesFrecuentes: (desde: string, hasta: string) => ["reportes", "clientes-frecuentes", desde, hasta] as const,
    atrasados: () => ["reportes", "atrasados"] as const,
  },
  usuarios: {
    root: ["usuarios"] as const,
    list: () => ["usuarios", "list"] as const,
  },
}

/**
 * Invalida todo lo que depende del stock y de la operación diaria.
 * Tras alquilar/devolver/reservar/ajustar stock cambian KPIs, alertas, calendario y disponibilidad.
 */
export function invalidateOperational(queryClient: QueryClient) {
  const roots = [
    queryKeys.dashboard.root,
    queryKeys.disfraces.root,
    queryKeys.disponibilidad.root,
    queryKeys.clientes.root,
    queryKeys.alquileres.root,
    queryKeys.devoluciones.root,
    queryKeys.reservas.root,
    queryKeys.calendario.root,
    queryKeys.alertas.root,
    queryKeys.reportes.root,
  ]
  return Promise.all(roots.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}
