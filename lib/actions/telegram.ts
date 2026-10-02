"use server"

import type { ActionResult } from "@/lib/action-result"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { enviarMensajeTelegram } from "@/lib/telegram/enviar"
import { construirResumen, obtenerDatosResumen } from "@/lib/telegram/resumen"

import { runAction } from "./run-action"

export type ResultadoResumen = { vencidas: number; proximas: number; retiros: number; stock: number }

/** Envía el resumen diario a Telegram en el momento (para probar la configuración). */
export async function enviarResumenTelegram(): Promise<ActionResult<ResultadoResumen>> {
  return runAction("telegram.resumen_manual", async () => {
    await requireAdmin()
    const datos = await obtenerDatosResumen(createAdminClient())
    await enviarMensajeTelegram(construirResumen(datos))
    return {
      vencidas: datos.vencidas.length,
      proximas: datos.proximas.length,
      retiros: datos.retiros.length,
      stock: datos.stock.length,
    }
  })
}
