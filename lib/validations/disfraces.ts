import { z } from "zod"

import { Constants } from "@/types/database.types"

const E = Constants.public.Enums

const optionalText = (max: number) => z.string().trim().max(max, { message: `Máximo ${max} caracteres` })

/** Campos editables de un disfraz (las cantidades se gestionan con movimientos de stock). */
export const disfrazBaseSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, { message: "Ingresá un código" })
    .max(32, { message: "Máximo 32 caracteres" })
    .regex(/^[A-Za-z0-9._-]+$/, { message: "Solo letras, números, puntos y guiones" }),
  nombre: z.string().trim().min(1, { message: "Ingresá el nombre" }).max(120, { message: "Máximo 120 caracteres" }),
  categoria: z.enum(E.categoria_disfraz, { message: "Elegí una categoría" }),
  talle: z.string().trim().min(1, { message: "Ingresá el talle" }).max(30, { message: "Máximo 30 caracteres" }),
  descripcion: optionalText(1000),
  stock_minimo: z
    .number({ message: "Ingresá un número" })
    .int({ message: "Debe ser un número entero" })
    .min(0, { message: "No puede ser negativo" })
    .max(1000),
  precio_alquiler: z.number({ message: "Ingresá el precio" }).min(0, { message: "No puede ser negativo" }).max(100_000_000),
  precio_reposicion: z
    .number({ message: "Ingresá el precio" })
    .min(0, { message: "No puede ser negativo" })
    .max(100_000_000),
  imagen_url: z.url({ message: "URL de imagen inválida" }).nullable(),
})

export const disfrazCreateSchema = disfrazBaseSchema.extend({
  cantidad_total: z
    .number({ message: "Ingresá la cantidad" })
    .int({ message: "Debe ser un número entero" })
    .min(0, { message: "No puede ser negativa" })
    .max(10_000),
})

export type DisfrazBaseInput = z.infer<typeof disfrazBaseSchema>
export type DisfrazCreateInput = z.infer<typeof disfrazCreateSchema>

export const TIPOS_AJUSTE = ["alta", "baja", "a_mantenimiento", "reparado", "extraviado", "recuperado"] as const
export const ORIGENES_BAJA = ["disponible", "mantenimiento", "extraviada"] as const

export const ajusteStockSchema = z.object({
  disfraz_id: z.uuid(),
  tipo: z.enum(TIPOS_AJUSTE, { message: "Elegí el tipo de movimiento" }),
  cantidad: z
    .number({ message: "Ingresá la cantidad" })
    .int({ message: "Debe ser un número entero" })
    .min(1, { message: "Debe ser al menos 1" })
    .max(10_000),
  origen: z.enum(ORIGENES_BAJA),
  motivo: z.string().trim().min(3, { message: "Contá brevemente el motivo" }).max(200),
})

export type AjusteStockInput = z.infer<typeof ajusteStockSchema>
