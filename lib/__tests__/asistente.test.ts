import { describe, expect, it } from "vitest"

import { normalizarArgumentos } from "@/lib/asistente/argumentos"

describe("normalizarArgumentos", () => {
  it("lee los argumentos normales del modelo", () => {
    expect(normalizarArgumentos('{"texto":"batman","solo_stock_bajo":true}')).toEqual({
      texto: "batman",
      solo_stock_bajo: true,
    })
  })

  it('desenvuelve la forma rara {"": {...}} que manda Groq en funciones sin parámetros', () => {
    expect(normalizarArgumentos('{"":{}}')).toEqual({})
    expect(normalizarArgumentos('{"":{"desde":"2026-09-01"}}')).toEqual({ desde: "2026-09-01" })
  })

  it("tolera vacíos, JSON inválido y tipos inesperados sin romper", () => {
    expect(normalizarArgumentos(undefined)).toEqual({})
    expect(normalizarArgumentos("")).toEqual({})
    expect(normalizarArgumentos("no es json")).toEqual({})
    expect(normalizarArgumentos("[1,2]")).toEqual({})
    expect(normalizarArgumentos("null")).toEqual({})
  })
})
