import { timingSafeEqual } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"

import { logger } from "@/lib/logger"
import { createAdminClient } from "@/lib/supabase/admin"
import { enviarMensajeTelegram } from "@/lib/telegram/enviar"
import { construirResumen, obtenerDatosResumen } from "@/lib/telegram/resumen"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Comparación en tiempo constante para no filtrar el secreto. */
function secretoValido(recibido: string | null): boolean {
  const esperado = process.env.CRON_SECRET
  if (!esperado || !recibido) return false
  const a = Buffer.from(recibido)
  const b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Envía el resumen diario a Telegram. La llama la tarea programada de Netlify
 * (netlify/functions/aviso-diario.mts) con el header x-cron-secret.
 * Usa el service role porque no hay sesión de usuario detrás.
 */
export async function POST(request: NextRequest) {
  const inicio = Date.now()
  if (!secretoValido(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const datos = await obtenerDatosResumen(createAdminClient())
    await enviarMensajeTelegram(construirResumen(datos))
    const resumen = {
      vencidas: datos.vencidas.length,
      proximas: datos.proximas.length,
      retiros: datos.retiros.length,
      stock: datos.stock.length,
    }
    logger.info("cron.telegram.ok", { ms: Date.now() - inicio, ...resumen })
    return NextResponse.json({ ok: true, ...resumen })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error desconocido"
    logger.error("cron.telegram.error", { ms: Date.now() - inicio, error: mensaje })
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
