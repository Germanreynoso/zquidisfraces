"use client"

import { CalendarRange } from "lucide-react"

import { DatePicker } from "@/components/form/fields"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { parseDate, todayISO } from "@/lib/format"

import { describirPeriodo, PRESETS, rangoDePreset, type Periodo, type PresetPeriodo } from "./periodo"

type Props = {
  value: Periodo
  onChange: (periodo: Periodo) => void
}

/** Selector de período con presets y rango personalizado (dos calendarios). */
export function PeriodoSelector({ value, onChange }: Props) {
  const hoy = todayISO()

  const onPreset = (preset: PresetPeriodo) => {
    if (preset === "personalizado") onChange({ ...value, preset })
    else onChange({ preset, ...rangoDePreset(preset, hoy) })
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Select value={value.preset} onValueChange={(v) => onPreset(v as PresetPeriodo)}>
        <SelectTrigger className="w-full sm:w-48" aria-label="Período">
          <CalendarRange />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.preset === "personalizado" ? (
        <div className="flex items-center gap-2">
          <DatePicker
            value={value.desde}
            onChange={(desde) => desde && onChange({ ...value, desde, hasta: value.hasta < desde ? desde : value.hasta })}
            disabledDays={{ after: parseDate(hoy) }}
            className="w-full sm:w-44"
            placeholder="Desde"
          />
          <span className="text-sm text-muted-foreground">al</span>
          <DatePicker
            value={value.hasta}
            onChange={(hasta) => hasta && onChange({ ...value, hasta })}
            disabledDays={[{ before: parseDate(value.desde) }, { after: parseDate(hoy) }]}
            className="w-full sm:w-44"
            placeholder="Hasta"
          />
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">{describirPeriodo(value)}</span>
      )}
    </div>
  )
}
