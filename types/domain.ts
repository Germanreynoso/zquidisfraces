import type { Database, Enums, Tables } from "./database.types"

type ViewRow<T extends keyof Database["public"]["Views"]> = Database["public"]["Views"][T]["Row"]
type FunctionReturns<T extends keyof Database["public"]["Functions"]> =
  Database["public"]["Functions"][T]["Returns"]

/**
 * Hace obligatorias (no nulas) las claves indicadas.
 * Postgres no informa nulabilidad en vistas ni columnas generadas, así que los tipos generados
 * las marcan como `| null`; acá se declara lo que el esquema garantiza.
 */
type Strict<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> }

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------
export type Rol = Enums<"app_rol">
export type CategoriaDisfraz = Enums<"categoria_disfraz">
export type EstadoDisfraz = Enums<"estado_disfraz">
export type EstadoAlquiler = Enums<"estado_alquiler">
export type EstadoReserva = Enums<"estado_reserva">
export type EstadoDevolucion = Enums<"estado_devolucion">
export type TipoMovimiento = Enums<"tipo_movimiento">
export type TipoPago = Enums<"tipo_pago">
export type MetodoPago = Enums<"metodo_pago">

// -----------------------------------------------------------------------------
// Tablas
// -----------------------------------------------------------------------------
export type Profile = Tables<"profiles">
export type Cliente = Tables<"clientes">
export type Disfraz = Strict<Tables<"disfraces">, "estado">
export type Alquiler = Strict<Tables<"alquileres">, "saldo_pendiente">
export type AlquilerItem = Strict<Tables<"alquiler_items">, "subtotal">
export type Pago = Tables<"pagos">
export type Reserva = Tables<"reservas">
export type ReservaItem = Tables<"reserva_items">
export type Devolucion = Tables<"devoluciones">
export type DevolucionItem = Tables<"devolucion_items">
export type MovimientoStock = Tables<"movimientos_stock">

// -----------------------------------------------------------------------------
// Vistas
// -----------------------------------------------------------------------------
export type DisfrazVista = Strict<
  ViewRow<"v_disfraces">,
  | "id"
  | "codigo"
  | "nombre"
  | "categoria"
  | "talle"
  | "estado"
  | "estado_efectivo"
  | "cantidad_total"
  | "cantidad_disponible"
  | "cantidad_alquilada"
  | "cantidad_mantenimiento"
  | "cantidad_extraviada"
  | "cantidad_reservada_hoy"
  | "stock_minimo"
  | "stock_bajo"
  | "precio_alquiler"
  | "precio_reposicion"
  | "activo"
  | "fecha_creacion"
  | "updated_at"
>

export type ClienteVista = Strict<
  ViewRow<"v_clientes">,
  | "id"
  | "nombre"
  | "apellido"
  | "nombre_completo"
  | "dni"
  | "activo"
  | "created_at"
  | "updated_at"
  | "total_alquileres"
  | "alquileres_activos"
  | "alquileres_vencidos"
  | "saldo_pendiente_total"
>

export type AlquilerVista = Strict<
  ViewRow<"v_alquileres">,
  | "id"
  | "cliente_id"
  | "fecha_alquiler"
  | "fecha_devolucion"
  | "estado"
  | "estado_efectivo"
  | "dias_atraso"
  | "monto_total"
  | "sena"
  | "cargos_adicionales"
  | "monto_pagado"
  | "saldo_pendiente"
  | "cliente_nombre"
  | "cliente_apellido"
  | "cliente_nombre_completo"
  | "cliente_dni"
  | "cantidad_items"
  | "created_at"
  | "updated_at"
>

export type ReservaVista = Strict<
  ViewRow<"v_reservas">,
  | "id"
  | "cliente_id"
  | "fecha_inicio"
  | "fecha_fin"
  | "estado"
  | "cliente_nombre"
  | "cliente_apellido"
  | "cliente_nombre_completo"
  | "cliente_dni"
  | "cantidad_items"
  | "created_at"
  | "updated_at"
>

export type DevolucionVista = Strict<
  ViewRow<"v_devoluciones">,
  | "id"
  | "alquiler_id"
  | "cliente_id"
  | "fecha_devolucion_real"
  | "fecha_alquiler"
  | "fecha_devolucion_pactada"
  | "dias_atraso"
  | "estado_disfraz"
  | "costo_reparacion"
  | "costo_reposicion"
  | "cliente_nombre_completo"
  | "cliente_dni"
  | "unidades_danadas"
  | "unidades_faltantes"
  | "created_at"
>

export type MovimientoVista = Strict<
  ViewRow<"v_movimientos_stock">,
  "id" | "disfraz_id" | "tipo" | "cantidad" | "created_at" | "disfraz_codigo" | "disfraz_nombre" | "disfraz_talle"
>

export type TipoAlerta = "devolucion_vencida" | "devolucion_proxima" | "stock_bajo" | "extraviado" | "reserva_proxima"
export type SeveridadAlerta = "alta" | "media" | "baja"
export type ReferenciaAlerta = "alquiler" | "disfraz" | "reserva"

export type Alerta = {
  id: string
  tipo: TipoAlerta
  severidad: SeveridadAlerta
  referencia_tipo: ReferenciaAlerta
  referencia_id: string
  titulo: string
  descripcion: string
  fecha: string | null
}

// -----------------------------------------------------------------------------
// RPC
// -----------------------------------------------------------------------------
export type DashboardResumen = {
  modelos: number
  total_unidades: number
  disponibles: number
  alquilados: number
  mantenimiento: number
  extraviados: number
  proximos_a_devolver: number
  atrasados: number
  alquileres_activos: number
  reservas_proximas: number
  ingresos_mes: number
  saldo_por_cobrar: number
}

export type ReporteIngresosFila = FunctionReturns<"reporte_ingresos">[number]
export type ReporteMasAlquiladosFila = FunctionReturns<"reporte_mas_alquilados">[number]
export type ReporteClientesFrecuentesFila = FunctionReturns<"reporte_clientes_frecuentes">[number]
export type DisponibilidadFila = FunctionReturns<"disponibilidad_rango">[number]

/** Item enviado a crear_alquiler / crear_reserva. */
export type ItemSolicitado = { disfraz_id: string; cantidad: number }
