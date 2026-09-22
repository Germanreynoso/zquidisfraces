import { z } from "zod"

import { todayISO } from "@/lib/format"

/** Fecha "YYYY-MM-DD" (formato de los campos date de Postgres). */
export const fechaISO = z
  .string({ message: "Elegí una fecha" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Elegí una fecha" })

export const ESTADOS_RESERVA_INICIAL = ["pendiente", "confirmada"] as const
export const ESTADOS_RESERVA_EDITABLES = ["confirmada", "cancelada"] as const

export const reservaItemSchema = z.object({
  disfraz_id: z.uuid({ message: "Disfraz inválido" }),
  cantidad: z
    .number({ message: "Ingresá la cantidad" })
    .int({ message: "Debe ser un número entero" })
    .min(1, { message: "Debe ser al menos 1" })
    .max(1000),
})

/** Payload que recibe la Server Action (la validación de stock la hace la base con bloqueo de filas). */
export const reservaSchema = z
  .object({
    cliente_id: z.uuid({ message: "Elegí un cliente" }),
    fecha_inicio: fechaISO,
    fecha_fin: fechaISO,
    estado: z.enum(ESTADOS_RESERVA_INICIAL, { message: "Elegí el estado inicial" }),
    observaciones: z.string().trim().max(1000, { message: "Máximo 1000 caracteres" }),
    items: z.array(reservaItemSchema).min(1, { message: "Agregá al menos un disfraz" }),
  })
  .refine((data) => data.fecha_inicio >= todayISO(), {
    path: ["fecha_inicio"],
    message: "La reserva debe comenzar hoy o en una fecha futura",
  })
  .refine((data) => data.fecha_fin >= data.fecha_inicio, {
    path: ["fecha_fin"],
    message: "Debe ser igual o posterior a la fecha de inicio",
  })

export type ReservaInput = z.infer<typeof reservaSchema>

export const estadoReservaSchema = z.object({
  id: z.uuid({ message: "Identificador inválido" }),
  estado: z.enum(ESTADOS_RESERVA_EDITABLES, { message: "Estado inválido" }),
})

export type EstadoReservaInput = z.infer<typeof estadoReservaSchema>
