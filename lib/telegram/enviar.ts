import "server-only"

import { logger } from "@/lib/logger"

/** Envío de mensajes por el bot de Telegram. Token y chat solo viven en el servidor. */

export type TelegramConfig = { token: string; chats: string[] }

/** TELEGRAM_CHAT_ID admite varios destinatarios separados por coma. */
export function parsearChats(valor: string | undefined): string[] {
  return (valor ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => /^-?\d+$/.test(c))
}

export function getTelegramConfig(): TelegramConfig {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chats = parsearChats(process.env.TELEGRAM_CHAT_ID)
  if (!token || chats.length === 0) {
    throw new Error(
      "Falta configurar Telegram: cargá TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID (las da @BotFather y el chat del bot)."
    )
  }
  return { token, chats }
}

export function telegramConfigurado(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}

const LIMITE_TELEGRAM = 4096

/** Envía el mensaje a todos los destinatarios configurados. Falla solo si no llegó a ninguno. */
export async function enviarMensajeTelegram(texto: string): Promise<{ enviados: number }> {
  const { token, chats } = getTelegramConfig()
  const cuerpo = texto.slice(0, LIMITE_TELEGRAM)
  let ultimoError: string | null = null
  let enviados = 0

  for (const chat of chats) {
    const respuesta = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: cuerpo, parse_mode: "HTML", disable_web_page_preview: true }),
    })

    if (respuesta.ok) {
      enviados++
      continue
    }

    const detalle = await respuesta.text()
    logger.error("telegram.error", { status: respuesta.status, detalle: detalle.slice(0, 300) })
    if (respuesta.status === 401) throw new Error("El token del bot de Telegram es inválido.")
    ultimoError =
      respuesta.status === 400 && detalle.includes("chat not found")
        ? "Alguno de los chats de Telegram no existe. Cada destinatario tiene que haberle escrito al bot."
        : "Telegram rechazó el mensaje."
  }

  if (enviados === 0) throw new Error(ultimoError ?? "No se pudo enviar el mensaje a Telegram.")
  logger.info("telegram.enviado", { caracteres: texto.length, enviados, destinatarios: chats.length })
  return { enviados }
}
