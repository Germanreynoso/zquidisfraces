import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

import { getPublicEnv } from "@/lib/env"
import type { Database } from "@/types/database.types"

const PUBLIC_ONLY_ROUTES = ["/login"]
const PROTECTED_PREFIX = "/dashboard"

/**
 * Refresca la sesión de Supabase en cada request y aplica las redirecciones de acceso.
 * La autorización real (rol, perfil activo) se valida en el layout del dashboard y en RLS.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, anonKey } = getPublicEnv()

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value))
      },
    },
  })

  // No ejecutar código entre createServerClient y getClaims: puede desloguear usuarios al azar.
  const { data } = await supabase.auth.getClaims()
  const isAuthenticated = Boolean(data?.claims?.sub)
  const { pathname, search } = request.nextUrl

  const redirectTo = (path: string, params?: Record<string, string>) => {
    const target = request.nextUrl.clone()
    target.pathname = path
    target.search = params ? `?${new URLSearchParams(params)}` : ""
    const redirect = NextResponse.redirect(target)
    // Conserva las cookies de sesión refrescadas.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  if (!isAuthenticated && pathname.startsWith(PROTECTED_PREFIX)) {
    return redirectTo("/login", { next: `${pathname}${search}` })
  }

  if (isAuthenticated && PUBLIC_ONLY_ROUTES.includes(pathname)) {
    return redirectTo(PROTECTED_PREFIX)
  }

  return response
}
