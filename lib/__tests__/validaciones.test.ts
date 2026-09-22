import { describe, expect, it } from "vitest"

import { safeNextPath } from "@/lib/validations/auth"
import { clienteSchema, CLIENTE_VACIO, normalizarDni } from "@/lib/validations/clientes"
import { ajusteStockSchema, disfrazCreateSchema } from "@/lib/validations/disfraces"

describe("clientes", () => {
  it("normaliza DNI con puntos y espacios", () => {
    expect(normalizarDni("30.111.222")).toBe("30111222")
    expect(normalizarDni(" aa 123-456 ")).toBe("AA123456")
  })

  it("acepta un cliente válido y rechaza DNI o email inválidos", () => {
    const base = { ...CLIENTE_VACIO, nombre: "Lucía", apellido: "Fernández", dni: "30.111.222" }
    expect(clienteSchema.safeParse(base).success).toBe(true)
    expect(clienteSchema.safeParse({ ...base, dni: "12" }).success).toBe(false)
    expect(clienteSchema.safeParse({ ...base, email: "no-es-email" }).success).toBe(false)
    expect(clienteSchema.safeParse({ ...base, email: "lucia@example.com" }).success).toBe(true)
  })
})

describe("disfraces", () => {
  const valido = {
    codigo: "SH-001",
    nombre: "Hombre Araña",
    categoria: "superheroes",
    talle: "M",
    descripcion: "",
    cantidad_total: 2,
    stock_minimo: 1,
    precio_alquiler: 25000,
    precio_reposicion: 150000,
    imagen_url: null,
  }

  it("valida el alta", () => {
    expect(disfrazCreateSchema.safeParse(valido).success).toBe(true)
    expect(disfrazCreateSchema.safeParse({ ...valido, codigo: "SH 001" }).success).toBe(false)
    expect(disfrazCreateSchema.safeParse({ ...valido, cantidad_total: -1 }).success).toBe(false)
    expect(disfrazCreateSchema.safeParse({ ...valido, categoria: "inexistente" }).success).toBe(false)
  })

  it("exige motivo y cantidad positiva en los ajustes de stock", () => {
    const ajuste = {
      disfraz_id: "8f0a5a3c-9d1e-4b7a-9a51-2d1f0c3b4e5f",
      tipo: "alta",
      cantidad: 1,
      origen: "disponible",
      motivo: "Compra",
    }
    expect(ajusteStockSchema.safeParse(ajuste).success).toBe(true)
    expect(ajusteStockSchema.safeParse({ ...ajuste, cantidad: 0 }).success).toBe(false)
    expect(ajusteStockSchema.safeParse({ ...ajuste, motivo: "" }).success).toBe(false)
  })
})

describe("safeNextPath", () => {
  it("solo permite rutas internas del dashboard", () => {
    expect(safeNextPath("/dashboard/alquileres")).toBe("/dashboard/alquileres")
    expect(safeNextPath("https://malicioso.com")).toBe("/dashboard")
    expect(safeNextPath("//malicioso.com")).toBe("/dashboard")
    expect(safeNextPath(null)).toBe("/dashboard")
  })
})
