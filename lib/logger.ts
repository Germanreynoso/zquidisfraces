type Level = "debug" | "info" | "warn" | "error"

type Fields = Record<string, unknown>

/**
 * Logger estructurado (JSON por línea). En Vercel/Node se integra con cualquier colector de logs.
 * Nunca loguear secretos ni datos personales completos (DNI, teléfono, email).
 */
function write(level: Level, message: string, fields?: Fields) {
  if (level === "debug" && process.env.NODE_ENV === "production") return
  const entry = { level, message, time: new Date().toISOString(), ...fields }
  const line = JSON.stringify(entry, (_key, value) =>
    value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value
  )
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (message: string, fields?: Fields) => write("debug", message, fields),
  info: (message: string, fields?: Fields) => write("info", message, fields),
  warn: (message: string, fields?: Fields) => write("warn", message, fields),
  error: (message: string, fields?: Fields) => write("error", message, fields),
}
