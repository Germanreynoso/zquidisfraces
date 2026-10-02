import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { parsearChats } from "@/lib/telegram/enviar"
import { construirResumen, type DatosResumen } from "@/lib/telegram/resumen"

const vacio: DatosResumen = { hoy: "2026-10-02", vencidas: [], proximas: [], retiros: [], stock: [] }

describe("construirResumen", () => {
  it("avisa cuando no hay pendientes", () => {
    const texto = construirResumen(vacio)
    expect(texto).toContain("ZiquiDisfraces")
    expect(texto).toContain("Sin pendientes")
    expect(texto).not.toContain("Devoluciones vencidas")
  })

  it("lista las devoluciones vencidas con atraso, saldo y teléfono", () => {
    const texto = construirResumen({
      ...vacio,
      vencidas: [
        { cliente: "Fernández, Lucía", telefono: "11 5555-0101", dias_atraso: 3, items: "Drácula (L) ×1", saldo: 15000 },
        { cliente: "Gómez, Martín", telefono: null, dias_atraso: 1, items: "Bruja (Único) ×2", saldo: 0 },
      ],
    })
    expect(texto).toContain("Devoluciones vencidas (2)")
    expect(texto).toContain("3 días")
    expect(texto).toContain("11 5555-0101")
    expect(texto).toMatch(/1 día —/)
    // Sin saldo no se menciona deuda.
    expect(texto.split("Gómez")[1]).not.toContain("debe")
  })

  it("corta los listados largos y aclara cuántos quedaron afuera", () => {
    const texto = construirResumen({
      ...vacio,
      proximas: Array.from({ length: 11 }, (_, i) => ({
        cliente: `Cliente ${i + 1}`,
        fecha: "2026-10-02",
        items: "Disfraz ×1",
      })),
    })
    expect(texto).toContain("Vencen hoy y mañana (11)")
    expect(texto).toContain("…y 3 más")
  })

  it("escapa los caracteres que Telegram interpreta como HTML", () => {
    const texto = construirResumen({
      ...vacio,
      stock: [{ nombre: "Traje <Rey> & Reina", talle: "M", disponibles: 0, minimo: 1, extraviadas: 0 }],
    })
    expect(texto).toContain("Traje &lt;Rey&gt; &amp; Reina")
  })

  it("muestra los retiros de reservas marcando las no confirmadas", () => {
    const texto = construirResumen({
      ...vacio,
      retiros: [{ cliente: "López, Valentina", hasta: "2026-10-04", items: "Elsa ×3", estado: "pendiente" }],
    })
    expect(texto).toContain("Retiros de reservas de hoy (1)")
    expect(texto).toContain("(sin confirmar)")
  })
})

describe("parsearChats", () => {
  it("acepta uno o varios destinatarios separados por coma", () => {
    expect(parsearChats("8999372270")).toEqual(["8999372270"])
    expect(parsearChats(" 8999372270 , 5610278550 ")).toEqual(["8999372270", "5610278550"])
    expect(parsearChats("-1001234567890")).toEqual(["-1001234567890"])
  })

  it("descarta valores que no son ids", () => {
    expect(parsearChats("")).toEqual([])
    expect(parsearChats("pegá-acá-el-id, 123")).toEqual(["123"])
  })
})
