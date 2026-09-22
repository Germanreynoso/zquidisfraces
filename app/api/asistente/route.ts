import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { responder } from "@/lib/asistente/groq"
import { getSession } from "@/lib/auth"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const cuerpoSchema = z.object({
  mensajes: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      })
    )
    .min(1)
    // Solo el tramo reciente de la charla: alcanza para el contexto y acota el costo.
    .max(24),
})

/** Responde preguntas sobre el negocio consultando la base con la sesión del usuario. */
export async function POST(request: NextRequest) {
  const inicio = Date.now()
  const session = await getSession()
  if (!session || !session.profile.activo) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 })
  }

  const parsed = cuerpoSchema.safeParse(cuerpo)
  if (!parsed.success) {
    return NextResponse.json({ error: "El mensaje es demasiado largo o está vacío." }, { status: 400 })
  }

  try {
    const { respuesta, consultas } = await responder(
      session.supabase,
      session.profile,
      parsed.data.mensajes.slice(-12)
    )
    logger.info("asistente.ok", { ms: Date.now() - inicio, consultas: consultas.length })
    return NextResponse.json({ respuesta, consultas })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "El asistente no está disponible."
    logger.error("asistente.error", { ms: Date.now() - inicio, error: mensaje })
    return NextResponse.json({ error: mensaje }, { status: 502 })
  }
}
