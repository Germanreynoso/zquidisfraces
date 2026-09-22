/**
 * MODO DEMO LOCAL — ver la app completa sin Supabase ni Docker.
 *
 *   pnpm demo            → http://localhost:3000  (usuario: demo@ziquidisfraces.com / demo1234)
 *
 * Levanta, en memoria y solo en tu PC:
 *   1. Postgres (PGlite) con las migraciones reales + datos de prueba (supabase/seed.sql).
 *   2. PostgREST (la misma API REST que usa Supabase) contra ese Postgres.
 *   3. Un gateway en :54321 que imita las rutas de Supabase: /rest/v1 → PostgREST, /auth/v1 (login simulado
 *      con usuarios fijos) y /storage/v1 (archivos en .demo/storage).
 *   4. Next.js en modo desarrollo apuntando a ese gateway.
 * Los datos se pierden al cerrar. NO usar en producción: las claves y usuarios son públicos.
 */
import { spawn, type ChildProcess } from "node:child_process"
import { createHmac, randomUUID } from "node:crypto"
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from "node:http"
import { dirname, join } from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm"
import { PGLiteSocketServer } from "@electric-sql/pglite-socket"

const ROOT = process.cwd()
const PORTS = { gateway: 54321, postgres: 54322, postgrest: 54323, next: 3000 }
const GATEWAY_URL = `http://127.0.0.1:${PORTS.gateway}`
const JWT_SECRET = "ziquidisfraces-demo-local-secret-no-usar-en-produccion-2026"
const POSTGREST_BIN = join(ROOT, ".demo", "bin", process.platform === "win32" ? "postgrest.exe" : "postgrest")
const STORAGE_DIR = join(ROOT, ".demo", "storage")

type DemoUser = { id: string; email: string; password: string; nombre: string; rol: "admin" | "empleado" }

export const DEMO_USERS: DemoUser[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    email: "demo@ziquidisfraces.com",
    password: "demo1234",
    nombre: "Dueño Demo",
    rol: "admin",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    email: "empleado@ziquidisfraces.com",
    password: "demo1234",
    nombre: "Empleado Demo",
    rol: "empleado",
  },
]

const log = (message: string) => console.log(`\x1b[35m[demo]\x1b[0m ${message}`)

// -----------------------------------------------------------------------------
// JWT (HS256), como los que emite Supabase Auth
// -----------------------------------------------------------------------------
const b64url = (value: Buffer | string) => Buffer.from(value).toString("base64url")

function signJwt(payload: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = b64url(JSON.stringify(payload))
  const signature = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url")
  return `${header}.${body}.${signature}`
}

function verifyJwt(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null
  const [header, body, signature] = token.split(".")
  if (!header || !body || !signature) return null
  const expected = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url")
  if (expected !== signature) return null
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Record<string, unknown>
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null
  return payload
}

const now = () => Math.floor(Date.now() / 1000)
const LONG_LIVED = now() + 60 * 60 * 24 * 365 * 5

export const ANON_KEY = signJwt({ iss: "supabase-demo", role: "anon", iat: now(), exp: LONG_LIVED })
export const SERVICE_ROLE_KEY = signJwt({ iss: "supabase-demo", role: "service_role", iat: now(), exp: LONG_LIVED })

const lastSignIn = new Map<string, string>()

function userObject(user: DemoUser) {
  const created = "2026-01-01T12:00:00.000Z"
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    email_confirmed_at: created,
    phone: "",
    confirmed_at: created,
    last_sign_in_at: lastSignIn.get(user.id) ?? null,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { nombre: user.nombre },
    identities: [],
    created_at: created,
    updated_at: created,
    is_anonymous: false,
  }
}

function session(user: DemoUser) {
  const expiresIn = 3600
  const iat = now()
  lastSignIn.set(user.id, new Date().toISOString())
  const accessToken = signJwt({
    aud: "authenticated",
    iss: `${GATEWAY_URL}/auth/v1`,
    sub: user.id,
    email: user.email,
    phone: "",
    role: "authenticated",
    aal: "aal1",
    session_id: randomUUID(),
    is_anonymous: false,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { nombre: user.nombre },
    iat,
    exp: iat + expiresIn,
  })
  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: iat + expiresIn,
    refresh_token: b64url(user.id),
    user: userObject(user),
  }
}

// -----------------------------------------------------------------------------
// Base de datos
// -----------------------------------------------------------------------------
async function startDatabase() {
  const db = new PGlite({ extensions: { pg_trgm } })
  await db.exec("set timezone = 'UTC'")
  await db.exec(readFileSync(join(ROOT, "scripts/db/supabase-stubs.sql"), "utf8"))
  const migrations = readdirSync(join(ROOT, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()
  for (const file of migrations) await db.exec(readFileSync(join(ROOT, "supabase/migrations", file), "utf8"))

  // El primer usuario queda admin activo por el trigger; al resto se le asigna rol y se habilita.
  for (const user of DEMO_USERS) {
    await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
      user.id,
      user.email,
      JSON.stringify({ nombre: user.nombre }),
    ])
    await db.query("update public.profiles set rol = $2, activo = true, nombre = $3 where id = $1", [
      user.id,
      user.rol,
      user.nombre,
    ])
  }

  await db.exec(readFileSync(join(ROOT, "supabase/seed.sql"), "utf8"))
  return db
}

// -----------------------------------------------------------------------------
// Gateway con rutas de Supabase
// -----------------------------------------------------------------------------
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, prefer, range, accept, accept-profile, content-profile, x-client-info, x-supabase-api-version, x-upsert, cache-control",
  "Access-Control-Expose-Headers": "content-range, content-location, x-total-count",
  "Access-Control-Max-Age": "86400",
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { ...CORS_HEADERS, "Content-Type": "application/json" })
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}

function bearer(req: IncomingMessage): string | undefined {
  const auth = req.headers.authorization
  return auth?.startsWith("Bearer ") ? auth.slice(7) : undefined
}

function proxyToPostgrest(req: IncomingMessage, res: ServerResponse, path: string) {
  const headers = { ...req.headers, host: `127.0.0.1:${PORTS.postgrest}` }
  if (!headers.authorization && typeof req.headers.apikey === "string") {
    headers.authorization = `Bearer ${req.headers.apikey}`
  }
  const upstream = httpRequest(
    { host: "127.0.0.1", port: PORTS.postgrest, method: req.method, path, headers },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, { ...upstreamRes.headers, ...CORS_HEADERS })
      upstreamRes.pipe(res)
    }
  )
  upstream.on("error", (error) => sendJson(res, 502, { message: `PostgREST no disponible: ${error.message}` }))
  req.pipe(upstream)
}

async function handleAuth(req: IncomingMessage, res: ServerResponse, url: URL) {
  const path = url.pathname.replace(/^\/auth\/v1/, "")

  if (path === "/token" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)).toString() || "{}") as Record<string, string>
    const grant = url.searchParams.get("grant_type")
    let user: DemoUser | undefined
    if (grant === "password") {
      user = DEMO_USERS.find((u) => u.email === body.email?.toLowerCase() && u.password === body.password)
      if (!user) {
        return sendJson(res, 400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" })
      }
    } else if (grant === "refresh_token") {
      const id = Buffer.from(body.refresh_token ?? "", "base64url").toString()
      user = DEMO_USERS.find((u) => u.id === id)
      if (!user) return sendJson(res, 400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" })
    } else {
      return sendJson(res, 400, { code: 400, error_code: "unsupported_grant_type", msg: "Grant no soportado en modo demo" })
    }
    return sendJson(res, 200, session(user))
  }

  if (path === "/user") {
    const claims = verifyJwt(bearer(req))
    const user = DEMO_USERS.find((u) => u.id === claims?.sub)
    if (!user) return sendJson(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" })
    return sendJson(res, 200, userObject(user))
  }

  if (path === "/logout") {
    res.writeHead(204, CORS_HEADERS)
    return res.end()
  }

  if (path === "/.well-known/jwks.json") return sendJson(res, 200, { keys: [] })

  if (path.startsWith("/admin/users")) {
    const claims = verifyJwt(bearer(req))
    if (claims?.role !== "service_role") return sendJson(res, 403, { msg: "Solo service role" })
    if (req.method === "GET" && path === "/admin/users") {
      return sendJson(res, 200, { aud: "authenticated", users: DEMO_USERS.map(userObject) })
    }
    return sendJson(res, 422, {
      code: 422,
      error_code: "demo_mode",
      msg: "La gestión de usuarios de Auth no está disponible en el modo demo",
    })
  }

  return sendJson(res, 404, { msg: `Ruta de auth no simulada: ${path}` })
}

async function handleStorage(req: IncomingMessage, res: ServerResponse, url: URL) {
  const path = decodeURIComponent(url.pathname.replace(/^\/storage\/v1/, ""))

  const publicMatch = path.match(/^\/object\/public\/([^/]+)\/(.+)$/)
  if (publicMatch && (req.method === "GET" || req.method === "HEAD")) {
    const file = join(STORAGE_DIR, publicMatch[1], publicMatch[2])
    if (!existsSync(file)) return sendJson(res, 404, { message: "Object not found" })
    const ext = file.split(".").pop() ?? ""
    const type = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }[ext] ?? "application/octet-stream"
    res.writeHead(200, { ...CORS_HEADERS, "Content-Type": type, "Cache-Control": "public, max-age=3600" })
    return res.end(req.method === "HEAD" ? undefined : readFileSync(file))
  }

  const objectMatch = path.match(/^\/object\/([^/]+)\/(.+)$/)
  if (objectMatch && (req.method === "POST" || req.method === "PUT")) {
    const file = join(STORAGE_DIR, objectMatch[1], objectMatch[2])
    mkdirSync(dirname(file), { recursive: true })
    const body = await readBody(req)
    const contentType = req.headers["content-type"] ?? ""
    // supabase-js sube archivos como multipart/form-data: se extrae el primer archivo.
    if (contentType.startsWith("multipart/form-data")) {
      const form = await new Response(new Uint8Array(body), { headers: { "content-type": contentType } }).formData()
      const entry = [...form.values()].find((value): value is File => typeof value !== "string")
      writeFileSync(file, entry ? Buffer.from(await entry.arrayBuffer()) : body)
    } else {
      writeFileSync(file, body)
    }
    return sendJson(res, 200, { Id: randomUUID(), Key: `${objectMatch[1]}/${objectMatch[2]}` })
  }

  const bucketMatch = path.match(/^\/object\/([^/]+)$/)
  if (bucketMatch && req.method === "DELETE") {
    const body = JSON.parse((await readBody(req)).toString() || "{}") as { prefixes?: string[] }
    for (const prefix of body.prefixes ?? []) rmSync(join(STORAGE_DIR, bucketMatch[1], prefix), { force: true })
    return sendJson(res, 200, (body.prefixes ?? []).map((name) => ({ name })))
  }

  return sendJson(res, 404, { message: `Ruta de storage no simulada: ${path}` })
}

function startGateway() {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", GATEWAY_URL)
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS_HEADERS)
      return res.end()
    }
    if (url.pathname.startsWith("/rest/v1")) {
      return proxyToPostgrest(req, res, `${url.pathname.replace(/^\/rest\/v1/, "") || "/"}${url.search}`)
    }
    const handler = url.pathname.startsWith("/auth/v1")
      ? handleAuth
      : url.pathname.startsWith("/storage/v1")
        ? handleStorage
        : null
    if (!handler) return sendJson(res, 404, { message: "Ruta no simulada" })
    handler(req, res, url).catch((error: unknown) => {
      console.error(error)
      sendJson(res, 500, { message: error instanceof Error ? error.message : "Error del gateway" })
    })
  })
  return new Promise<void>((resolve) => server.listen(PORTS.gateway, "127.0.0.1", resolve))
}

// -----------------------------------------------------------------------------
// PostgREST y Next.js
// -----------------------------------------------------------------------------
const children: ChildProcess[] = []

const POSTGREST_VERSION = "v16.3"
const POSTGREST_ASSETS: Record<string, string> = {
  win32: `postgrest-${POSTGREST_VERSION}-windows-x86-64.zip`,
  linux: `postgrest-${POSTGREST_VERSION}-linux-static-x86-64.tar.xz`,
  darwin: `postgrest-${POSTGREST_VERSION}-macos-aarch64.tar.xz`,
}

/** Descarga el binario oficial de PostgREST la primera vez (queda en .demo/bin, fuera de git). */
async function ensurePostgrest() {
  if (existsSync(POSTGREST_BIN)) return
  const asset = POSTGREST_ASSETS[process.platform]
  if (!asset) throw new Error(`Plataforma no soportada para el modo demo: ${process.platform}`)
  const url = `https://github.com/PostgREST/postgrest/releases/download/${POSTGREST_VERSION}/${asset}`
  log(`Descargando PostgREST ${POSTGREST_VERSION} (solo la primera vez)…`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo descargar PostgREST (${response.status}) desde ${url}`)
  const binDir = dirname(POSTGREST_BIN)
  mkdirSync(binDir, { recursive: true })
  const archive = join(binDir, asset)
  writeFileSync(archive, Buffer.from(await response.arrayBuffer()))
  // bsdtar (incluido en Windows 10+, macOS y Linux) extrae tanto .zip como .tar.xz.
  await new Promise<void>((resolve, reject) => {
    // En Windows se usa el tar del sistema (bsdtar): el de Git Bash (GNU tar) no abre .zip.
    const tarBin =
      process.platform === "win32" ? join(process.env.SystemRoot ?? "C:\Windows", "System32", "tar.exe") : "tar"
    const tar = spawn(tarBin, ["-xf", archive, "-C", binDir], { stdio: "inherit" })
    tar.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`tar terminó con código ${code}`))))
    tar.on("error", reject)
  })
  rmSync(archive, { force: true })
  if (!existsSync(POSTGREST_BIN)) throw new Error(`No se encontró ${POSTGREST_BIN} después de extraer ${asset}`)
}

async function startPostgrest(): Promise<void> {
  await ensurePostgrest()
  const child = spawn(POSTGREST_BIN, [], {
    env: {
      ...process.env,
      PGRST_DB_URI: `postgres://postgres:postgres@127.0.0.1:${PORTS.postgres}/postgres?sslmode=disable`,
      PGRST_DB_SCHEMAS: "public",
      PGRST_DB_ANON_ROLE: "anon",
      PGRST_JWT_SECRET: JWT_SECRET,
      PGRST_SERVER_HOST: "127.0.0.1",
      PGRST_SERVER_PORT: String(PORTS.postgrest),
      PGRST_DB_POOL: "4",
      PGRST_DB_CHANNEL_ENABLED: "false",
      PGRST_DB_PREPARED_STATEMENTS: "false",
      PGRST_DB_CONFIG: "false",
      PGRST_LOG_LEVEL: "warn",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  children.push(child)
  child.stderr?.on("data", (d: Buffer) => process.stderr.write(`[postgrest] ${d}`))
  child.stdout?.on("data", (d: Buffer) => {
    if (/error|fatal/i.test(d.toString())) process.stdout.write(`[postgrest] ${d}`)
  })

  // Espera a que el schema cache esté cargado.
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const probe = () => {
      const req = httpRequest(
        {
          host: "127.0.0.1",
          port: PORTS.postgrest,
          path: "/disfraces?select=id&limit=1",
          headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        },
        (res) => {
          res.resume()
          if (res.statusCode === 200) resolve()
          else retry()
        }
      )
      req.on("error", retry)
      req.end()
    }
    const retry = () => {
      if (Date.now() - started > 60_000) reject(new Error("PostgREST no respondió en 60 s"))
      else setTimeout(probe, 500)
    }
    child.on("exit", (code) => reject(new Error(`PostgREST terminó (código ${code})`)))
    probe()
  })
}

function startNext() {
  const nextBin = join(ROOT, "node_modules", "next", "dist", "bin", "next")
  const child = spawn(process.execPath, [nextBin, "dev", "--turbopack", "-p", String(PORTS.next)], {
    env: {
      ...process.env,
      // Las variables del proceso tienen prioridad sobre .env.local: el demo nunca toca tu proyecto real.
      NEXT_PUBLIC_SUPABASE_URL: GATEWAY_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ANON_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
    },
    stdio: "inherit",
  })
  children.push(child)
  child.on("exit", (code) => shutdown(code ?? 0))
}

function shutdown(code = 0) {
  for (const child of children) if (!child.killed) child.kill()
  process.exit(code)
}

process.on("SIGINT", () => shutdown(0))
process.on("SIGTERM", () => shutdown(0))

async function main() {
  const started = Date.now()
  log("Creando base de datos en memoria (migraciones + datos de prueba)…")
  const db = await startDatabase()

  const pgServer = new PGLiteSocketServer({ db, port: PORTS.postgres, host: "127.0.0.1", maxConnections: 10 })
  await pgServer.start()
  log(`Postgres (PGlite) escuchando en :${PORTS.postgres}`)

  await startGateway()
  log(`Gateway estilo Supabase en ${GATEWAY_URL}`)

  await startPostgrest()
  log(`PostgREST listo en :${PORTS.postgrest}`)

  log(`Backend listo en ${((Date.now() - started) / 1000).toFixed(1)} s. Iniciando Next.js…`)
  log("────────────────────────────────────────────────────────────")
  log(`  Abrí  http://localhost:${PORTS.next}`)
  for (const user of DEMO_USERS) log(`  ${user.rol.padEnd(8)}  ${user.email}  /  ${user.password}`)
  log("  Los datos viven en memoria: se reinician al cerrar (Ctrl+C).")
  log("────────────────────────────────────────────────────────────")

  if (!process.argv.includes("--backend-only")) startNext()
}

main().catch((error: unknown) => {
  console.error(error)
  shutdown(1)
})
