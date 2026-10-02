import { describe, expect, it } from "vitest"

import { decidirRedimension, LADO_MAXIMO, medidasDestino } from "@/lib/imagen"

describe("decidirRedimension", () => {
  it("deja pasar una foto chica en formato soportado", () => {
    expect(decidirRedimension("image/jpeg", 300 * 1024, 1200, 900)).toEqual({
      redimensionar: false,
      motivo: "ninguno",
    })
  })

  it("reprocesa fotos de celular (pesadas y grandes)", () => {
    expect(decidirRedimension("image/jpeg", 6 * 1024 * 1024, 4032, 3024).redimensionar).toBe(true)
    expect(decidirRedimension("image/jpeg", 300 * 1024, 4032, 3024).motivo).toBe("medidas")
    expect(decidirRedimension("image/png", 2 * 1024 * 1024, 1000, 800).motivo).toBe("peso")
  })

  it("convierte formatos no soportados, como el HEIC del iPhone", () => {
    expect(decidirRedimension("image/heic", 200 * 1024, 800, 600)).toEqual({
      redimensionar: true,
      motivo: "formato",
    })
  })
})

describe("medidasDestino", () => {
  it("mantiene la proporción al achicar", () => {
    expect(medidasDestino(4000, 3000)).toEqual({ ancho: LADO_MAXIMO, alto: 1200 })
    expect(medidasDestino(3000, 4000)).toEqual({ ancho: 1200, alto: LADO_MAXIMO })
  })

  it("no agranda una foto chica", () => {
    expect(medidasDestino(800, 600)).toEqual({ ancho: 800, alto: 600 })
  })
})
