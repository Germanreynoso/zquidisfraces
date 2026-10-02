import type { Config } from "@netlify/functions"

/**
 * Tarea programada: todas las mañanas pide el resumen diario, que se envía a Telegram.
 * 12:00 UTC = 9:00 en Argentina (el país no cambia de hora).
 */
export default async function avisoDiario() {
  const base = process.env.URL ?? process.env.DEPLOY_PRIME_URL
  const secreto = process.env.CRON_SECRET

  if (!base || !secreto) {
    console.error("[aviso-diario] falta URL del sitio o CRON_SECRET")
    return new Response("configuración incompleta", { status: 500 })
  }

  const respuesta = await fetch(`${base}/api/cron/telegram`, {
    method: "POST",
    headers: { "x-cron-secret": secreto },
  })
  const cuerpo = await respuesta.text()
  console.log(`[aviso-diario] ${respuesta.status} ${cuerpo.slice(0, 200)}`)
  return new Response(cuerpo, { status: respuesta.status })
}

export const config: Config = { schedule: "0 12 * * *" }
