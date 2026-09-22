import { addDaysISO, formatDate, todayISO } from "@/lib/format"

export type PresetPeriodo = "ultimos-30" | "este-mes" | "mes-anterior" | "este-anio" | "personalizado"

export type Periodo = { preset: PresetPeriodo; desde: string; hasta: string }

export const PRESETS: { value: PresetPeriodo; label: string }[] = [
  { value: "ultimos-30", label: "Últimos 30 días" },
  { value: "este-mes", label: "Este mes" },
  { value: "mes-anterior", label: "Mes anterior" },
  { value: "este-anio", label: "Este año" },
  { value: "personalizado", label: "Personalizado" },
]

const pad = (n: number) => String(n).padStart(2, "0")

/** Rango [desde, hasta] (YYYY-MM-DD) de un preset, calculado sobre "hoy" en la zona del negocio. */
export function rangoDePreset(preset: Exclude<PresetPeriodo, "personalizado">, hoy: string = todayISO()) {
  const [anio, mes] = hoy.split("-").map(Number)
  switch (preset) {
    case "ultimos-30":
      return { desde: addDaysISO(hoy, -29), hasta: hoy }
    case "este-mes":
      return { desde: `${anio}-${pad(mes)}-01`, hasta: hoy }
    case "mes-anterior": {
      const anioAnterior = mes === 1 ? anio - 1 : anio
      const mesAnterior = mes === 1 ? 12 : mes - 1
      const primeroDelMes = `${anio}-${pad(mes)}-01`
      return { desde: `${anioAnterior}-${pad(mesAnterior)}-01`, hasta: addDaysISO(primeroDelMes, -1) }
    }
    case "este-anio":
      return { desde: `${anio}-01-01`, hasta: hoy }
  }
}

export function periodoInicial(): Periodo {
  return { preset: "ultimos-30", ...rangoDePreset("ultimos-30") }
}

export function describirPeriodo({ desde, hasta }: Pick<Periodo, "desde" | "hasta">): string {
  return `${formatDate(desde)} al ${formatDate(hasta)}`
}
