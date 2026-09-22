# ZiquiDisfraces

Sistema web para administrar un negocio de alquiler de disfraces: inventario por talle y estado, clientes,
alquileres, devoluciones (con daños y faltantes), reservas sin sobreventa, calendario, alertas y reportes
exportables a PDF y Excel.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Supabase (Postgres, Auth, Storage) ·
TanStack Query y Table · React Hook Form + Zod · FullCalendar · Recharts.

---

## 1. Requisitos

- Node.js 20.9 o superior y pnpm 10 (`npm i -g pnpm`)
- Un proyecto en [Supabase](https://supabase.com) (el plan gratuito alcanza)
- No hace falta Docker

## 2. Instalación

```bash
pnpm install
cp .env.example .env.local
```

Completá `.env.local` con los datos de **Supabase → Project Settings → API**:

| Variable | Valor | ¿Pública? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto | Sí |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clave `publishable` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY` con la `anon` legacy) | Sí (la protege RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | clave `secret` / `service_role` | **No. Nunca la subas ni la expongas** |
| `SUPABASE_DB_URL` | Connect → Session pooler → URI (solo para `pnpm db:apply`) | **No** |

## 3. Base de datos

Las migraciones están en `supabase/migrations/` y se aplican **en orden**:

| Archivo | Contenido |
|---|---|
| `20260921000001_schema.sql` | Enums, tablas, relaciones, constraints e índices |
| `20260921000002_functions.sql` | Funciones de negocio (alquilar, devolver, reservar, ajustar stock), vistas y reportes |
| `20260921000003_rls.sql` | Row Level Security y permisos por rol |
| `20260921000004_storage.sql` | Bucket `disfraces` para imágenes y sus políticas |

**Opción A: un comando.** Con `SUPABASE_DB_URL` en `.env.local`:

```bash
pnpm db:apply --seed   # migraciones pendientes + datos de prueba
```

**Opción B: SQL Editor.** En Supabase → SQL Editor, pegá y ejecutá cada archivo en orden.
Después, si querés datos de prueba, ejecutá `supabase/seed.sql`.

**Opción C: Supabase CLI.**

```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db push          # aplica las migraciones
# datos de prueba (opcional): pegá supabase/seed.sql en el SQL Editor
```

### Verificar el SQL sin tocar tu proyecto

```bash
pnpm verify:db
```

Levanta un Postgres en memoria (PGlite), aplica migraciones y seed, y corre los tests SQL de
`supabase/tests/` (stock, conflictos de reservas, devoluciones, permisos y RLS).

## 4. Autenticación

1. En **Authentication → Sign In / Providers**, dejá habilitado *Email* y **desactivá “Allow new users to sign up”**.
   Los usuarios los crea el administrador; la app no tiene registro público.
2. Creá el usuario administrador (dueño):

   ```bash
   pnpm create-admin --email vos@tunegocio.com --password "una-contraseña-segura" --nombre "Tu Nombre"
   ```

   Alternativa sin consola: creá el usuario en **Authentication → Users → Add user** (marcando *Auto Confirm*).
   **El primer usuario del sistema queda como administrador activo**; los siguientes quedan como empleados
   inactivos hasta que un admin los habilite.
3. El resto del equipo se gestiona desde **Usuarios** dentro de la app (solo admin).

### Roles

| Rol | Puede |
|---|---|
| **ADMIN** | Todo: inventario, precios, stock, cancelar alquileres, usuarios, reportes |
| **EMPLEADO** | Ver todo; crear/editar clientes; registrar alquileres, devoluciones, pagos y reservas |

Los permisos se aplican en tres capas: la interfaz oculta acciones, las Server Actions validan el rol y la base
de datos lo impone con RLS y funciones con chequeo de rol.

## 5. Storage

La migración `20260921000004_storage.sql` crea el bucket público `disfraces` (máx. 5 MB; JPG, PNG o WEBP).
Las fotos se leen por URL pública; solo un admin puede subirlas, reemplazarlas o borrarlas.

## 6. Ejecutar

```bash
pnpm dev        # http://localhost:3000
pnpm build && pnpm start
```

### Modo demo (sin Supabase ni Docker)

```bash
pnpm demo       # http://localhost:3000 · demo@ziquidisfraces.com / demo1234
```

Levanta en tu PC una base en memoria con las migraciones reales y los datos de prueba, la API REST oficial
(PostgREST, se descarga sola la primera vez) y un login simulado. Sirve para mostrar el sistema o probar cambios;
los datos se reinician al cerrarlo. No usar en producción.

## 7. Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` / `pnpm start` | Build y servidor de producción |
| `pnpm typecheck` | Chequeo de tipos |
| `pnpm lint` | ESLint |
| `pnpm test` | Tests unitarios (Vitest) |
| `pnpm verify:db` | Migraciones + seed + tests SQL en PGlite |
| `pnpm gen:types` | Regenera `types/database.types.ts` desde las migraciones |
| `pnpm create-admin` | Crea o promueve al administrador |
| `pnpm db:apply [--seed]` | Aplica migraciones pendientes (y datos de prueba) a tu Supabase |
| `pnpm demo` | Modo demo local sin Supabase |
| `pnpm check` | typecheck + lint + tests + verify:db |

También podés regenerar los tipos desde tu proyecto real con
`npx supabase gen types typescript --project-id <ref> --schema public > types/database.types.ts`.

## 8. Reglas de negocio

- **Stock por cantidades:** cada disfraz tiene `total = disponibles + alquiladas + mantenimiento + extraviadas`
  (constraint en la base). Las cantidades solo cambian mediante funciones que registran cada cambio en
  `movimientos_stock`; un trigger impide editarlas a mano.
- **Estado del disfraz:** se deriva de las cantidades. “Reservado” aparece cuando las reservas de hoy ocupan
  todo lo disponible.
- **Precio por alquiler** (no por día): `total = Σ cantidad × precio`. El precio queda congelado en el alquiler.
- **Alquiler:** la fecha de alquiler no puede ser futura (para eso están las reservas). Valida stock físico y
  que no pise reservas del período.
- **Atrasado:** no se guarda; se calcula (alquiler activo con fecha de devolución vencida).
- **Reservas:** empiezan hoy o después. Pendientes y confirmadas bloquean stock; la base impide
  sobre-reservar (bloqueo de filas ante operaciones simultáneas). Al retirarse pasan a “Retirada” y se convierten
  en alquiler.
- **Devolución:** una por alquiler; por cada disfraz se informan unidades OK (vuelven a disponible), dañadas
  (a mantenimiento) y faltantes (a extraviadas). Los costos de reparación y reposición se suman al saldo.
- **Pagos:** la seña y los cobros posteriores se registran en `pagos`, que alimenta el reporte de ingresos.
  No se permite cobrar más que el saldo.
- **Alertas:** devoluciones vencidas, devoluciones de hoy/mañana, stock bajo (disponibles por debajo del mínimo),
  extraviados y reservas que empiezan en los próximos 3 días.

## 9. Estructura

```
app/                    rutas (login, dashboard/*, api/reportes)
components/             UI por módulo + ui/ (shadcn) + data-table/ + form/ + pickers/
hooks/                  hooks de TanStack Query por módulo
lib/supabase/           clientes browser, server, admin (service role) y middleware
lib/actions/            Server Actions (validación Zod + rol + mapeo de errores)
lib/queries/            lecturas tipadas
lib/validations/        schemas Zod compartidos entre formularios y servidor
lib/reportes/           definición y generación de PDF/Excel
types/                  tipos de la base (generados) y de dominio
supabase/               migraciones, seed y tests SQL
scripts/                verify-db, gen-types, create-admin
```

## 10. Deploy (Vercel)

1. Importá el repositorio en Vercel.
2. Cargá las tres variables de entorno (la `SUPABASE_SERVICE_ROLE_KEY` solo en el entorno de servidor).
3. En Supabase → Authentication → URL Configuration, poné la URL de producción como *Site URL*.
