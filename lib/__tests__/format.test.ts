import { describe, expect, it } from "vitest"

import { addDaysISO, daysBetween, formatCurrency, formatDate, initials, pluralize, todayISO } from "@/lib/format"

describe("todayISO", () => {
  it("usa la zona horaria de Buenos Aires y no la del servidor", () => {
    // 02:30 UTC del 22/09 todavía es 21/09 en Argentina (UTC-3).
    expect(todayISO(new Date("2026-09-22T02:30:00Z"))).toBe("2026-09-21")
    expect(todayISO(new Date("2026-09-22T03:30:00Z"))).toBe("2026-09-22")
  })
})

describe("fechas date-only", () => {
  it("formatea YYYY-MM-DD sin corrimiento de zona", () => {
    expect(formatDate("2026-01-01")).toBe("01/01/2026")
  })

  it("suma días cruzando meses y años", () => {
    expect(addDaysISO("2026-12-30", 3)).toBe("2027-01-02")
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28")
  })

  it("calcula días entre fechas", () => {
    expect(daysBetween("2026-09-20", "2026-09-23")).toBe(3)
    expect(daysBetween("2026-09-23", "2026-09-20")).toBe(-3)
  })

  it("devuelve un guion para valores vacíos", () => {
    expect(formatDate(null)).toBe("—")
  })
})

describe("formatos", () => {
  it("formatea pesos argentinos sin decimales", () => {
    expect(formatCurrency(15000).replace(/\s/g, " ")).toMatch(/\$\s?15\.000/)
    expect(formatCurrency(null).replace(/\s/g, " ")).toMatch(/\$\s?0/)
  })

  it("pluraliza", () => {
    expect(pluralize(1, "día")).toBe("1 día")
    expect(pluralize(3, "día")).toBe("3 días")
  })

  it("calcula iniciales", () => {
    expect(initials("lucía fernández")).toBe("LF")
    expect(initials(undefined)).toBe("?")
  })
})
