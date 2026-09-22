import { z } from "zod"

/** DNI/pasaporte: sin puntos, espacios ni guiones, en mayúsculas. */
export function normalizarDni(value: string): string {
  return value.replace(/[.\s-]/g, "").toUpperCase()
}

const emailOpcional = z
  .string()
  .trim()
  .max(120, { message: "Máximo 120 caracteres" })
  .refine((value) => value === "" || z.email().safeParse(value).success, { message: "Email inválido" })

export const clienteSchema = z.object({
  nombre: z.string().trim().min(1, { message: "Ingresá el nombre" }).max(80, { message: "Máximo 80 caracteres" }),
  apellido: z.string().trim().min(1, { message: "Ingresá el apellido" }).max(80, { message: "Máximo 80 caracteres" }),
  dni: z
    .string()
    .trim()
    .min(1, { message: "Ingresá el DNI" })
    .refine((value) => /^[0-9A-Z]{5,15}$/.test(normalizarDni(value)), {
      message: "Entre 5 y 15 letras o números (sin puntos)",
    }),
  telefono: z.string().trim().max(40, { message: "Máximo 40 caracteres" }),
  email: emailOpcional,
  direccion: z.string().trim().max(200, { message: "Máximo 200 caracteres" }),
  notas: z.string().trim().max(1000, { message: "Máximo 1000 caracteres" }),
})

export type ClienteInput = z.infer<typeof clienteSchema>

export const CLIENTE_VACIO: ClienteInput = {
  nombre: "",
  apellido: "",
  dni: "",
  telefono: "",
  email: "",
  direccion: "",
  notas: "",
}
