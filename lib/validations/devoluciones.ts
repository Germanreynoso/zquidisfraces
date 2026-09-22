import { z } from "zod"

import { Constants } from "@/types/database.types"

const E = Constants.public.Enums

const unidades = z.number({ message: "Ingresá un número" }).int().min(0, { message: "No puede ser negativa" })

export const devolucionItemSchema = z
  .object({
    alquiler_item_id: z.uuid(),
    /** Unidades alquiladas del item (referencia para validar la suma). */
    cantidad: z.number().int().min(1),
    cantidad_ok: unidades,
    cantidad_danada: unidades,
    cantidad_faltante: unidades,
    observaciones: z.string().trim().max(300, { message: "Máximo 300 caracteres" }),
  })
  .refine((item) => item.cantidad_ok + item.cantidad_danada + item.cantidad_faltante === item.cantidad, {
    path: ["cantidad_ok"],
    message: "Las cantidades deben sumar lo alquilado",
  })

export const devolucionSchema = z.object({
  alquiler_id: z.uuid(),
  fecha_devolucion_real: z.iso.date({ message: "Elegí la fecha de devolución" }),
  items: z.array(devolucionItemSchema).min(1, { message: "El alquiler no tiene disfraces" }),
  costo_reparacion: z.number({ message: "Ingresá el costo (0 si no hay)" }).min(0, { message: "No puede ser negativo" }),
  costo_reposicion: z.number({ message: "Ingresá el costo (0 si no hay)" }).min(0, { message: "No puede ser negativo" }),
  observaciones: z.string().trim().max(500, { message: "Máximo 500 caracteres" }),
  monto_cobrado: z.number({ message: "Ingresá el monto (0 si no cobrás ahora)" }).min(0, { message: "No puede ser negativo" }),
  metodo_pago: z.enum(E.metodo_pago),
})

export type DevolucionInput = z.infer<typeof devolucionSchema>
