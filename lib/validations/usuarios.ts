import { z } from "zod"

import { Constants } from "@/types/database.types"

const rolSchema = z.enum(Constants.public.Enums.app_rol, { message: "Elegí un rol" })

export const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(2, { message: "Ingresá el nombre" }).max(80, { message: "Máximo 80 caracteres" }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(120, { message: "Máximo 120 caracteres" })
    .refine((value) => z.email().safeParse(value).success, { message: "Ingresá un email válido" }),
  password: z
    .string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
    .max(72, { message: "Máximo 72 caracteres" }),
  rol: rolSchema,
})

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>

export const cambiarRolSchema = z.object({
  userId: z.uuid({ message: "Usuario inválido" }),
  rol: rolSchema,
})

export type CambiarRolInput = z.infer<typeof cambiarRolSchema>

export const cambiarEstadoUsuarioSchema = z.object({
  userId: z.uuid({ message: "Usuario inválido" }),
  activo: z.boolean(),
})

export type CambiarEstadoUsuarioInput = z.infer<typeof cambiarEstadoUsuarioSchema>
