# ZquiDisfraces · guía para agentes

Sistema de gestión de alquiler de disfraces. Next.js 15 (App Router) + Supabase. UI en español rioplatense (voseo).
Spec: `docs/superpowers/specs/2026-09-21-zquidisfraces-design.md`.

## Comandos
- `pnpm check` = typecheck + lint + tests (Vitest) + `verify:db` (migraciones + seed + tests SQL en PGlite, sin Docker).
- `pnpm gen:types` después de cualquier cambio de SQL (regenera `types/database.types.ts`; no editarlo a mano).

## Convenciones
- Lecturas: `lib/queries/*` (reciben el cliente Supabase) → hooks TanStack en `hooks/*`. Listados paginados/filtrados
  en el servidor con `ListParams` + `DataTable` (`components/data-table`).
- Mutaciones: Server Actions en `lib/actions/*` envueltas en `runAction` (Zod + `requireStaff`/`requireAdmin`, errores
  mapeados por `lib/errors.ts`). En el cliente: `useMutation` + `unwrap` + `invalidateOperational` si toca stock.
- Operaciones de stock SOLO vía RPC (`crear_alquiler`, `registrar_devolucion`, `crear_reserva`, `ajustar_stock`, …).
  Un trigger impide editar cantidades de `disfraces` directamente.
- Errores de negocio en SQL: `RAISE EXCEPTION` con mensaje en español (se muestra tal cual al usuario).
- Nuevas funciones SQL: `set search_path = ''`, nombres calificados, `SECURITY DEFINER` solo en wrappers con chequeo
  de rol; lógica en `app_private.*_impl`. Agregar tests en `supabase/tests/`.
- Tipos de vistas: usar los de `types/domain.ts` (declaran la nulabilidad real).
- Formularios: `components/form/fields.tsx` (RHF + shadcn Field). Fechas date-only como `YYYY-MM-DD`; "hoy" con
  `todayISO()` (zona Buenos Aires, igual que `public.hoy()`).
- Colores de gráficos: `var(--chart-1..5)` en orden fijo (paleta validada para daltonismo). Estados de stock:
  emerald/sky/amber/rose 600.
