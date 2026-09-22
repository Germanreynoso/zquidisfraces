import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import { CURRENCY, LOCALE, TIMEZONE } from "@/lib/constants"

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat(LOCALE)

export function formatCurrency(value: number | null | undefined): string {
  return currencyFormatter.format(Number(value ?? 0))
}

export function formatNumber(value: number | null | undefined): string {
  return numberFormatter.format(Number(value ?? 0))
}

/**
 * Las fechas "date" de Postgres llegan como "YYYY-MM-DD". parseISO las interpreta en hora local
 * (sin corrimiento de zona), a diferencia de `new Date("YYYY-MM-DD")` que las toma como UTC.
 */
export function parseDate(value: string): Date {
  return parseISO(value)
}

export function formatDate(value: string | Date | null | undefined, pattern = "dd/MM/yyyy"): string {
  if (!value) return "—"
  const date = typeof value === "string" ? parseISO(value) : value
  return format(date, pattern, { locale: es })
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, "dd/MM/yyyy HH:mm")
}

export function formatDateLong(value: string | Date | null | undefined): string {
  return formatDate(value, "EEEE d 'de' MMMM")
}

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria del negocio, igual que public.hoy() en la base. */
export function todayISO(now: Date = new Date()): string {
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

export function addDaysISO(iso: string, days: number): string {
  const date = parseISO(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** Días desde `from` hasta `to` (ambos YYYY-MM-DD). Positivo si `to` es posterior. */
export function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from))
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}
