import { z } from "zod"

import { todayISO } from "@/lib/format"
import { Constants } from "@/types/database.types"

const E = Constants.public.Enums

const fecha = (message: string) => z.iso.date({ message })

const snapshotSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  nombre: z.string(),
  talle: z.string(),
  precio_alquiler: z.number(),
  cantidad_disponible: z.number(),
  imagen_url: z.string().nullable(),
})

const itemFormSchema = z.object({
  disfraz_id: z.uuid(),
  cantidad: z.number().int().min(1, { message: "La cantidad mínima es 1" }).max(1000),
  disfraz: snapshotSchema,
})

const clienteSeleccionadoSchema = z.object({ id: z.uuid(), label: z.string(), dni: z.string() })

/** Formulario de nuevo alquiler (incluye datos de presentación: cliente y snapshot de disfraces). */
export const alquilerFormSchema = z
  .object({
    cliente: clienteSeleccionadoSchema.nullable(),
    fecha_alquiler: fecha("Elegí la fecha de alquiler"),
    fecha_devolucion: fecha("Elegí la fecha de devolución"),
    items: z.array(itemFormSchema).min(1, { message: "Agregá al menos un disfraz" }).max(100),
    sena: z.number({ message: "Ingresá la seña (0 si no deja)" }).min(0, { message: "No puede ser negativa" }),
    metodo_pago: z.enum(E.metodo_pago),
    observaciones: z.string().trim().max(500, { message: "Máximo 500 caracteres" }),
    reserva_id: z.uuid().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.cliente) {
      ctx.addIssue({ code: "custom", path: ["cliente"], message: "Elegí un cliente" })
    }
    if (value.fecha_alquiler > todayISO()) {
      ctx.addIssue({
        code: "custom",
        path: ["fecha_alquiler"],
        message: "No puede ser futura: para fechas futuras registrá una reserva",
      })
    }
    if (value.fecha_devolucion < value.fecha_alquiler) {
      ctx.addIssue({
        code: "custom",
        path: ["fecha_devolucion"],
        message: "Debe ser igual o posterior a la fecha de alquiler",
      })
    }
    const total = value.items.reduce((sum, item) => sum + item.cantidad * item.disfraz.precio_alquiler, 0)
    if (value.sena > total) {
      ctx.addIssue({ code: "custom", path: ["sena"], message: "La seña no puede superar el total" })
    }
  })

export type AlquilerFormInput = z.infer<typeof alquilerFormSchema>

/** Payload validado en el servidor para crear_alquiler. */
export const crearAlquilerSchema = z
  .object({
    cliente_id: z.uuid({ message: "Elegí un cliente" }),
    fecha_alquiler: fecha("Fecha de alquiler inválida"),
    fecha_devolucion: fecha("Fecha de devolución inválida"),
    items: z
      .array(
        z.object({
          disfraz_id: z.uuid(),
          cantidad: z.number().int().min(1).max(1000),
        })
      )
      .min(1, { message: "Agregá al menos un disfraz" })
      .max(100),
    sena: z.number().min(0).max(100_000_000),
    metodo_pago: z.enum(E.metodo_pago),
    observaciones: z.string().trim().max(500),
    reserva_id: z.uuid().nullable(),
  })
  .refine((value) => value.fecha_devolucion >= value.fecha_alquiler, {
    path: ["fecha_devolucion"],
    message: "Debe ser igual o posterior a la fecha de alquiler",
  })

export type CrearAlquilerInput = z.infer<typeof crearAlquilerSchema>

export const cancelarAlquilerSchema = z.object({
  alquiler_id: z.uuid(),
  motivo: z.string().trim().max(300, { message: "Máximo 300 caracteres" }),
})

export type CancelarAlquilerInput = z.infer<typeof cancelarAlquilerSchema>

export const TIPOS_PAGO_MANUAL = ["saldo", "cargo_extra"] as const

export const pagoSchema = z.object({
  alquiler_id: z.uuid(),
  monto: z
    .number({ message: "Ingresá el monto" })
    .positive({ message: "Debe ser mayor a cero" })
    .max(100_000_000),
  metodo: z.enum(E.metodo_pago),
  tipo: z.enum(TIPOS_PAGO_MANUAL),
  fecha: fecha("Elegí la fecha del pago"),
  observaciones: z.string().trim().max(300, { message: "Máximo 300 caracteres" }),
})

export type PagoInput = z.infer<typeof pagoSchema>
