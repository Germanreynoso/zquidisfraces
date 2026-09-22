# ZquiDisfraces — Diseño del sistema de gestión de alquiler de disfraces

Fecha: 2026-09-21 · Estado: aprobado para implementación

## 1. Objetivo y alcance

Sistema web interno para un negocio de alquiler de disfraces con **un único dueño (ADMIN, control total)**.
Controla inventario, clientes, alquileres, devoluciones, reservas, movimientos de stock, calendario, alertas y reportes.

Fuera de alcance (YAGNI): multi-sucursal, recargos automáticos por atraso, devoluciones parciales en varias
entregas, facturación fiscal, portal de clientes.

## 2. Stack (versiones fijadas)

| Pieza | Versión | Nota |
|---|---|---|
| Next.js (App Router) + React 19 | 15.5.x | Obligatorio por spec (16 existe; no se usa) |
| TypeScript strict | 5.x | |
| TailwindCSS | 4.x | |
| shadcn/ui | CLI 4.x, base Radix | |
| Supabase | `@supabase/ssr` 0.12, `supabase-js` 2.x | Auth + Postgres + Storage |
| React Hook Form + Zod | 7.x / 4.x | `@hookform/resolvers` 5 |
| TanStack Query | 5.x | lecturas + cache + invalidación |
| TanStack Table | **8.x** | v9 salió en ago-2026; se evita por madurez |
| FullCalendar | **6.1.x** | v7 recién salido; se evita por madurez |
| Recharts | vía `shadcn chart` | gráficos dashboard/reportes |
| exceljs + jspdf/jspdf-autotable | | export Excel/PDF en el servidor |
| PGlite | dev | verificación del SQL sin Docker |
| Vitest | dev | tests de lógica pura |

Moneda ARS. Zona horaria `America/Argentina/Buenos_Aires`. Idioma de UI: español.

## 3. Arquitectura

```
app/
  (auth)/login                → login con email+password (Supabase Auth)
  dashboard/                  → layout protegido (sidebar + header + notificaciones)
    page.tsx                  → KPIs + gráficos + próximas devoluciones
    inventario/ clientes/ alquileres/ devoluciones/ reservas/
    calendario/ alertas/ reportes/ usuarios/
  api/reportes/[tipo]/route.ts → export PDF / Excel
lib/
  supabase/{client,server,admin,middleware}.ts
  actions/*.ts                → Server Actions (mutaciones), validadas con Zod
  validations/*.ts            → schemas Zod compartidos form ↔ server
  queries/*.ts                → funciones de lectura (usadas por hooks)
  constants.ts, format.ts, logger.ts, query-keys.ts
hooks/                        → hooks TanStack Query (useDisfraces, useAlquileres…)
components/
  ui/ (shadcn)  layout/  data-table/  <módulo>/
types/database.types.ts       → formato idéntico a `supabase gen types`
types/domain.ts               → tipos y labels de dominio
supabase/migrations/*.sql, supabase/seed.sql, supabase/tests/*.sql
scripts/create-admin.ts, scripts/verify-db.ts
```

**Flujo de datos**
- **Lecturas**: hooks TanStack Query → cliente Supabase de navegador → PostgREST (RLS aplica). Paginación, orden y
  búsqueda **del lado servidor** (`range()` + `count: 'exact'`), así escala a miles de registros.
- **Mutaciones**: formulario RHF+Zod → `useMutation` → **Server Action** (revalida con Zod, verifica sesión) →
  cliente Supabase de servidor (cookies, RLS aplica) → invalidación de query keys.
- **Operaciones transaccionales** (alquilar, devolver, reservar, ajustar stock, cancelar): **funciones Postgres
  (RPC)** `SECURITY DEFINER` con verificación de rol adentro, bloqueo de filas (`FOR UPDATE`) y registro en
  `movimientos_stock`. Garantiza atomicidad y evita carreras de stock entre dos usuarios.
- **Service role**: solo en servidor (`lib/supabase/admin.ts`, `import 'server-only'`) para gestión de usuarios y
  script de alta del admin. Nunca llega al navegador.

**Auth**
- `middleware.ts` refresca sesión (`getClaims`) y redirige: sin sesión → `/login`; con sesión en `/login` → `/dashboard`.
- El layout de `/dashboard` vuelve a verificar usuario + `profiles.activo` (defensa en profundidad).
- Registro público deshabilitado (no hay página de signup; se desactiva en el dashboard de Supabase).
- El rol vive en `profiles.rol` (nunca en `user_metadata`, que el usuario puede editar).

## 4. Modelo de datos

Enums: `app_rol(admin, empleado)`, `categoria_disfraz(superheroes, princesas, terror, animales, historicos,
profesiones, infantiles, adultos, otros)`, `estado_disfraz(disponible, alquilado, reservado, mantenimiento,
extraviado)`, `estado_alquiler(activo, devuelto, atrasado, cancelado)`, `estado_reserva(pendiente, confirmada,
cancelada, convertida)`, `estado_devolucion(bueno, con_danos, con_faltantes, con_danos_y_faltantes)`,
`tipo_movimiento(alta, baja, alquiler, devolucion, a_mantenimiento, reparado, extraviado, recuperado,
cancelacion_alquiler, ajuste)`, `tipo_pago(sena, saldo, cargo_extra)`, `metodo_pago(efectivo, transferencia,
tarjeta, otro)`.

### Tablas

- **profiles** `id (=auth.users.id), nombre, email, rol, activo, created_at`. Trigger crea el perfil al crear el usuario (rol `empleado` por defecto; el dueño se promueve con `scripts/create-admin.ts`).
- **disfraces** `id, codigo (único), nombre, categoria, descripcion, talle, estado (generado), cantidad_total,
  cantidad_disponible, cantidad_alquilada, cantidad_mantenimiento, cantidad_extraviada, stock_minimo,
  precio_alquiler, precio_reposicion, imagen_url, activo, fecha_creacion, updated_at, deleted_at`.
  - CHECK: `total = disponible + alquilada + mantenimiento + extraviada`, todas ≥ 0, precios ≥ 0.
  - `estado` = columna generada: disponible>0 → disponible; si no alquilada>0 → alquilado; mantenimiento>0 →
    mantenimiento; extraviada>0 → extraviado. La vista `v_disfraces` agrega `cantidad_reservada_hoy` y devuelve
    `reservado` cuando las reservas de hoy consumen todo lo disponible.
  - Eliminación lógica: `activo=false, deleted_at=now()`.
- **movimientos_stock** `id, disfraz_id, tipo, cantidad, alquiler_id?, devolucion_id?, motivo, usuario_id, created_at`. Solo se inserta desde funciones.
- **clientes** `id, nombre, apellido, dni (único), telefono, email, direccion, notas, activo, created_at, updated_at`.
- **alquileres** `id, cliente_id, reserva_id?, fecha_alquiler, fecha_devolucion, fecha_devolucion_real?, estado,
  monto_total, sena, cargos_adicionales, monto_pagado, saldo_pendiente (generado = total + cargos − pagado),
  observaciones, created_by, created_at, updated_at`. CHECK `fecha_devolucion >= fecha_alquiler`, `sena <= monto_total`.
  - Estado guardado: `activo | devuelto | cancelado`. **Atrasado se deriva** en `v_alquileres`
    (`activo` y `fecha_devolucion < hoy`) → nunca queda desactualizado.
- **alquiler_items** `id, alquiler_id, disfraz_id, cantidad (>0), precio_unitario (≥0), subtotal (generado)`.
- **pagos** `id, alquiler_id, fecha, monto (>0), tipo, metodo, observaciones, created_by`. Trigger recalcula
  `alquileres.monto_pagado`. Fuente de verdad de **Ingresos por período**.
- **devoluciones** `id, alquiler_id (único), fecha_devolucion_real, estado_disfraz, costo_reparacion,
  costo_reposicion, observaciones, created_by, created_at`.
- **devolucion_items** `id, devolucion_id, alquiler_item_id, disfraz_id, cantidad_ok, cantidad_danada,
  cantidad_faltante, observaciones`. CHECK suma = cantidad alquilada del item.
- **reservas** `id, cliente_id, fecha_inicio, fecha_fin, estado, sena, observaciones, alquiler_id?, created_by, created_at, updated_at`.
- **reserva_items** `id, reserva_id, disfraz_id, cantidad (>0)`.

Índices: FKs, `disfraces(categoria)`, `disfraces(activo)`, trigram en `disfraces(nombre, codigo)` y
`clientes(nombre, apellido, dni)` para búsqueda instantánea, `alquileres(estado, fecha_devolucion)`,
`reservas(estado, fecha_inicio, fecha_fin)`, `pagos(fecha)`.

## 5. Reglas de negocio

- **Precio**: por alquiler (no por día). `monto_total = Σ cantidad × precio_unitario`. El precio unitario se toma
  de `precio_alquiler` al crear y queda congelado en el item.
- **Disponibilidad en un rango** `[inicio, fin]` para un disfraz:
  `capacidad = total − mantenimiento − extraviada`; para cada día del rango
  `uso(d) = Σ alquileres activos que cubren d + Σ reservas pendientes/confirmadas que cubren d`;
  `disponible = capacidad − max(uso(d))`. Un alquiler vencido se considera ocupando hasta `max(fecha_devolucion, hoy)`.
- **Crear alquiler** (`crear_alquiler`): bloquea los disfraces, exige `cantidad_disponible ≥ cantidad` (físico) y
  disponibilidad en el rango ≥ cantidad (respeta reservas futuras). Mueve disponible→alquilada, registra
  movimiento, registra seña como pago. Opcional: convertir una reserva (la excluye del cálculo y la marca `convertida`).
- **Devolución** (`registrar_devolucion`): por item ok→disponible, dañada→mantenimiento, faltante→extraviada;
  alquilada −= cantidad. Alquiler → `devuelto` + `fecha_devolucion_real`. `cargos_adicionales = reparación + reposición`.
  Cobro opcional en el mismo acto (pago tipo `saldo`). Una sola devolución por alquiler.
- **Cancelar alquiler** (admin): devuelve unidades a disponible.
- **Reserva** (`crear_reserva` / `actualizar_estado_reserva`): `fecha_inicio ≥ hoy`, valida disponibilidad por
  item con bloqueo de filas → **imposible sobre-reservar**. Pendiente y Confirmada bloquean stock.
- **Ajuste de stock** (admin, `ajustar_stock`): alta de unidades, baja, a mantenimiento, reparado, extraviado,
  recuperado. Todo queda en `movimientos_stock`.
- **Alertas** (vista `v_alertas`, calculada): devoluciones vencidas, devoluciones hoy/mañana, stock bajo
  (`disponible ≤ stock_minimo`), disfraces con extraviados, reservas que empiezan en ≤ 3 días.

## 6. Seguridad (RLS)

Helpers `is_admin()`, `is_staff()` (`SECURITY DEFINER`, `search_path=''`), usados como `(select public.is_admin())`.

| Tabla | SELECT | INSERT/UPDATE | DELETE |
|---|---|---|---|
| profiles | staff | admin | — |
| disfraces | staff | admin | admin |
| clientes | staff | staff | admin |
| alquileres, alquiler_items, pagos, devoluciones, devolucion_items, reservas, reserva_items | staff | admin directo; staff solo vía RPC | admin |
| movimientos_stock | staff | solo vía RPC | — |

RPCs: `crear_alquiler`, `registrar_devolucion`, `registrar_pago`, `crear_reserva`, `actualizar_estado_reserva`
→ staff. `cancelar_alquiler`, `ajustar_stock` → admin. `EXECUTE` revocado a `anon`.

Storage: bucket público `disfraces` (lectura pública de fotos), escritura/borrado solo admin, máx 5 MB, solo
`image/jpeg|png|webp`.

## 7. UX

SaaS moderno: sidebar colapsable (sheet en mobile), header con breadcrumb, buscador, campana de notificaciones
(polling 60 s), toggle claro/oscuro, menú de usuario. Tablas con orden, filtros por facetas, paginación y búsqueda
con debounce (server-side). Formularios en diálogos/sheets con validación en vivo. Toasts (sonner).

## 8. Reportes

RPCs: `reporte_mas_alquilados`, `reporte_ingresos(desde, hasta, agrupacion)`, `reporte_clientes_frecuentes`,
más `v_disfraces` (inventario) y `v_alquileres` filtrado por atrasado. Export `GET /api/reportes/[tipo]?formato=pdf|xlsx&desde&hasta`
generado en el servidor con la sesión del usuario (RLS aplica).

## 9. Calidad y observabilidad

- `pnpm verify:db`: PGlite carga stubs de `auth`/`storage` + migraciones + seed + `supabase/tests/*.sql`
  (asserts de stock, conflicto de reservas, devolución, RLS básica).
- Vitest para lógica pura (cálculo de totales, estado efectivo, schemas Zod).
- `typecheck`, `lint`, `build` en verde antes de declarar terminado.
- `lib/logger.ts`: logs estructurados JSON en Server Actions/route handlers; errores de Postgres mapeados a
  mensajes en español sin filtrar detalles internos.

## 10. Entrega

Un solo repositorio, commits por fase:
1. Fundación: scaffold, dependencias, clientes Supabase, middleware, SQL completo + verificación PGlite, tipos, layout, login.
2. Inventario + dashboard.
3. Clientes, alquileres, devoluciones.
4. Reservas, calendario, alertas.
5. Reportes + export, usuarios, seed, README.
