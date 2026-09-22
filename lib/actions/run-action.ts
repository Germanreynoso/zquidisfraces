import "server-only"

import { z } from "zod"

import type { ActionResult } from "@/lib/action-result"
import { AuthorizationError } from "@/lib/auth"
import { friendlyDbMessage, GENERIC_ERROR, isDbError } from "@/lib/errors"
import { logger } from "@/lib/logger"

/**
 * Envoltorio común de Server Actions: validación, autorización, mapeo de errores y logging.
 * Las actions nunca lanzan hacia el cliente: siempre devuelven un ActionResult serializable.
 */
export async function runAction<T>(name: string, fn: () => Promise<T>): Promise<ActionResult<T>> {
  const started = Date.now()
  try {
    const data = await fn()
    logger.info("action.ok", { action: name, ms: Date.now() - started })
    return { ok: true, data }
  } catch (error) {
    const ms = Date.now() - started

    if (error instanceof z.ZodError) {
      logger.warn("action.validation", { action: name, ms, issues: error.issues.length })
      return { ok: false, error: "Revisá los datos ingresados.", fieldErrors: z.flattenError(error).fieldErrors }
    }

    if (error instanceof AuthorizationError) {
      logger.warn("action.unauthorized", { action: name, ms, reason: error.message })
      return { ok: false, error: error.message }
    }

    if (isDbError(error)) {
      const message = friendlyDbMessage(error)
      const log = message ? logger.warn : logger.error
      log("action.db_error", { action: name, ms, code: error.code, dbMessage: error.message, details: error.details })
      return { ok: false, error: message ?? GENERIC_ERROR }
    }

    logger.error("action.error", { action: name, ms, error })
    return { ok: false, error: GENERIC_ERROR }
  }
}
