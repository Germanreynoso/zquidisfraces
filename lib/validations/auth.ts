import { z } from "zod"

export const loginSchema = z.object({
  email: z.email({ message: "Ingresá un email válido" }).trim().toLowerCase(),
  password: z.string().min(6, { message: "La contraseña tiene al menos 6 caracteres" }).max(72),
  next: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>

/** Evita redirecciones abiertas: solo rutas internas del dashboard. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/dashboard") || next.startsWith("//")) return "/dashboard"
  return next
}
