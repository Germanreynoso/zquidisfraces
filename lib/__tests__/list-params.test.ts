import { describe, expect, it } from "vitest"

import { firstFilter, ilikeAny, pageRange, sanitizeSearch } from "@/lib/queries/list-params"

describe("sanitizeSearch", () => {
  it("elimina caracteres que rompen los filtros or() de PostgREST", () => {
    expect(sanitizeSearch('batman, (robin) "x" 100% a_b*')).toBe("batman robin x 100 a b")
  })

  it("normaliza espacios y limita longitud", () => {
    expect(sanitizeSearch("   hombre    araña  ")).toBe("hombre araña")
    expect(sanitizeSearch("a".repeat(200))).toHaveLength(80)
    expect(sanitizeSearch(undefined)).toBe("")
  })
})

describe("ilikeAny", () => {
  it("arma una condición OR por columna", () => {
    expect(ilikeAny(["nombre", "codigo"], "sh")).toBe("nombre.ilike.*sh*,codigo.ilike.*sh*")
  })
})

describe("pageRange", () => {
  it("convierte página (0-based) a rango inclusivo", () => {
    expect(pageRange(0, 10)).toEqual([0, 9])
    expect(pageRange(2, 20)).toEqual([40, 59])
  })
})

describe("firstFilter", () => {
  it("devuelve undefined para filtros vacíos", () => {
    expect(firstFilter({ page: 0, pageSize: 10, filters: { estado: [] } }, "estado")).toBeUndefined()
    expect(firstFilter({ page: 0, pageSize: 10, filters: { estado: ["activo"] } }, "estado")).toEqual(["activo"])
  })
})
