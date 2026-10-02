import "server-only"

import { logger } from "@/lib/logger"

/** Envío de mensajes por el bot de Telegram. Token y chat solo viven en el servidor. */

export type TelegramConfig = { token: string; chatId: string }

export function getTelegramConfig(): TelegramConfig {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    throw new Error(
      "Falta configurar Telegram: cargá TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID (las da @BotFather y el chat del bot)."
    )
  }
  return { token, chatId }
}

export function telegramConfigurado(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}

const LIMITE_TELEGRAM = 4096

export async function enviarMensajeTelegram(texto: string): Promise<void> {
  const { token, chatId } = getTelegramConfig()
  const respuesta = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: texto.slice(0, LIMITE_TELEGRAM),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  })

  if (!respuesta.ok) {
    const detalle = await respuesta.text()
    logger.error("telegram.error", { status: respuesta.status, detalle: detalle.slice(0, 300) })
    if (respuesta.status === 401) throw new Error("El token del bot de Telegram es inválido.")
    if (respuesta.status === 400 && detalle.includes("chat not found")) {
      throw new Error("No se encontró el chat de Telegram. Escribile algo al bot y revisá TELEGRAM_CHAT_ID.")
    }
    throw new Error("Telegram rechazó el mensaje.")
  }
  logger.info("telegram.enviado", { caracteres: texto.length })
}
