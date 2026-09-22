/**
 * Normaliza los argumentos que manda el modelo: llegan como texto JSON y, a veces,
 * con formas raras (por ejemplo {"": {}} cuando la función no tiene parámetros).
 */
export function normalizarArgumentos(crudos: string | undefined | null): Record<string, unknown> {
  if (!crudos || !crudos.trim()) return {}
  let valor: unknown
  try {
    valor = JSON.parse(crudos)
  } catch {
    return {}
  }
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {}
  const objeto = valor as Record<string, unknown>
  const claves = Object.keys(objeto)
  if (claves.length === 1 && claves[0] === "") {
    const interno = objeto[""]
    return interno && typeof interno === "object" && !Array.isArray(interno)
      ? (interno as Record<string, unknown>)
      : {}
  }
  return objeto
}
