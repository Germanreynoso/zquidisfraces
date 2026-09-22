import { describe, expect, it } from "vitest"

import { friendlyDbMessage } from "@/lib/errors"
import { storagePathFromPublicUrl } from "@/lib/storage"

describe("friendlyDbMessage", () => {
  it("muestra los mensajes de negocio de las funciones SQL", () => {
    expect(friendlyDbMessage({ code: "P0001", message: "Stock insuficiente para \"Drácula\"" })).toBe(
      'Stock insuficiente para "Drácula"'
    )
  })

  it("traduce violaciones de unicidad por constraint", () => {
    expect(
      friendlyDbMessage({
        code: "23505",
        message: 'duplicate key value violates unique constraint "clientes_dni_unico"',
      })
    ).toBe("Ya existe un cliente con ese DNI.")
  })

  it("oculta detalles de RLS", () => {
    expect(
      friendlyDbMessage({ code: "42501", message: 'new row violates row-level security policy for table "disfraces"' })
    ).toBe("No tenés permisos para realizar esta operación.")
  })

  it("devuelve null para errores desconocidos (se muestra un mensaje genérico)", () => {
    expect(friendlyDbMessage({ code: "XX000", message: "internal" })).toBeNull()
  })
})

describe("storagePathFromPublicUrl", () => {
  it("extrae la ruta de objetos del bucket propio", () => {
    expect(
      storagePathFromPublicUrl("https://abc.supabase.co/storage/v1/object/public/disfraces/foto%201.jpg?t=1")
    ).toBe("foto 1.jpg")
  })

  it("ignora imágenes externas", () => {
    expect(storagePathFromPublicUrl("https://cdn.example.com/foto.jpg")).toBeNull()
    expect(storagePathFromPublicUrl(null)).toBeNull()
  })
})
