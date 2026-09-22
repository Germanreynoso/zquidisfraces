import { Constants } from "@/types/database.types"
import type {
  CategoriaDisfraz,
  EstadoAlquiler,
  EstadoDevolucion,
  EstadoDisfraz,
  EstadoReserva,
  MetodoPago,
  Rol,
  SeveridadAlerta,
  TipoAlerta,
  TipoMovimiento,
  TipoPago,
} from "@/types/domain"

export const APP_NAME = "ZquiDisfraces"
export const TIMEZONE = "America/Argentina/Buenos_Aires"
export const LOCALE = "es-AR"
export const CURRENCY = "ARS"

export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

export const STORAGE_BUCKET_DISFRACES = "disfraces"
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

/** Tono visual reutilizable por badges, puntos de calendario y gráficos. */
export type Tone = "success" | "info" | "violet" | "warning" | "danger" | "neutral"

type Option<T extends string> = { value: T; label: string; tone?: Tone }

function options<T extends string>(values: readonly T[], labels: Record<T, string>, tones?: Record<T, Tone>) {
  return values.map((value) => ({ value, label: labels[value], tone: tones?.[value] })) as Option<T>[]
}

// -----------------------------------------------------------------------------
// Etiquetas de enums
// -----------------------------------------------------------------------------
export const ROL_LABEL: Record<Rol, string> = { admin: "Administrador", empleado: "Empleado" }

export const CATEGORIA_LABEL: Record<CategoriaDisfraz, string> = {
  superheroes: "Superhéroes",
  princesas: "Princesas",
  terror: "Terror",
  animales: "Animales",
  historicos: "Históricos",
  profesiones: "Profesiones",
  infantiles: "Infantiles",
  adultos: "Adultos",
  otros: "Otros",
}

export const ESTADO_DISFRAZ_LABEL: Record<EstadoDisfraz, string> = {
  disponible: "Disponible",
  alquilado: "Alquilado",
  reservado: "Reservado",
  mantenimiento: "Mantenimiento",
  extraviado: "Extraviado",
}
export const ESTADO_DISFRAZ_TONE: Record<EstadoDisfraz, Tone> = {
  disponible: "success",
  alquilado: "info",
  reservado: "violet",
  mantenimiento: "warning",
  extraviado: "danger",
}

export const ESTADO_ALQUILER_LABEL: Record<EstadoAlquiler, string> = {
  activo: "Activo",
  devuelto: "Devuelto",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
}
export const ESTADO_ALQUILER_TONE: Record<EstadoAlquiler, Tone> = {
  activo: "info",
  devuelto: "success",
  atrasado: "danger",
  cancelado: "neutral",
}

export const ESTADO_RESERVA_LABEL: Record<EstadoReserva, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  convertida: "Retirada",
}
export const ESTADO_RESERVA_TONE: Record<EstadoReserva, Tone> = {
  pendiente: "warning",
  confirmada: "success",
  cancelada: "neutral",
  convertida: "info",
}

export const ESTADO_DEVOLUCION_LABEL: Record<EstadoDevolucion, string> = {
  bueno: "En buen estado",
  con_danos: "Con daños",
  con_faltantes: "Con faltantes",
  con_danos_y_faltantes: "Daños y faltantes",
}
export const ESTADO_DEVOLUCION_TONE: Record<EstadoDevolucion, Tone> = {
  bueno: "success",
  con_danos: "warning",
  con_faltantes: "danger",
  con_danos_y_faltantes: "danger",
}

export const TIPO_MOVIMIENTO_LABEL: Record<TipoMovimiento, string> = {
  alta: "Alta",
  baja: "Baja",
  alquiler: "Alquiler",
  devolucion: "Devolución",
  a_mantenimiento: "A mantenimiento",
  reparado: "Reparado",
  extraviado: "Extraviado",
  recuperado: "Recuperado",
  cancelacion_alquiler: "Cancelación",
  ajuste: "Ajuste",
}

export const TIPO_PAGO_LABEL: Record<TipoPago, string> = {
  sena: "Seña",
  saldo: "Saldo",
  cargo_extra: "Cargo extra",
}

export const METODO_PAGO_LABEL: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
}

export const TIPO_ALERTA_LABEL: Record<TipoAlerta, string> = {
  devolucion_vencida: "Devolución vencida",
  devolucion_proxima: "Devolución próxima",
  stock_bajo: "Stock bajo",
  extraviado: "Extraviados",
  reserva_proxima: "Reserva próxima",
}
export const SEVERIDAD_TONE: Record<SeveridadAlerta, Tone> = { alta: "danger", media: "warning", baja: "info" }

/** Talles sugeridos (el campo acepta texto libre). */
export const TALLES_SUGERIDOS = [
  "Infantil 2-4",
  "Infantil 4-6",
  "Infantil 6-8",
  "Infantil 8-10",
  "Infantil 10-12",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "Adulto",
  "Único",
] as const

// -----------------------------------------------------------------------------
// Opciones para selects y filtros
// -----------------------------------------------------------------------------
const E = Constants.public.Enums

export const CATEGORIA_OPTIONS = options(E.categoria_disfraz, CATEGORIA_LABEL)
export const ESTADO_DISFRAZ_OPTIONS = options(E.estado_disfraz, ESTADO_DISFRAZ_LABEL, ESTADO_DISFRAZ_TONE)
export const ESTADO_ALQUILER_OPTIONS = options(E.estado_alquiler, ESTADO_ALQUILER_LABEL, ESTADO_ALQUILER_TONE)
export const ESTADO_RESERVA_OPTIONS = options(E.estado_reserva, ESTADO_RESERVA_LABEL, ESTADO_RESERVA_TONE)
export const ESTADO_DEVOLUCION_OPTIONS = options(E.estado_devolucion, ESTADO_DEVOLUCION_LABEL, ESTADO_DEVOLUCION_TONE)
export const METODO_PAGO_OPTIONS = options(E.metodo_pago, METODO_PAGO_LABEL)
export const ROL_OPTIONS = options(E.app_rol, ROL_LABEL)
