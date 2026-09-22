import {
  Bell,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  LayoutDashboard,
  PackageOpen,
  Receipt,
  Shirt,
  Undo2,
  Users,
  UserCog,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  adminOnly?: boolean
  /** Muestra el contador de alertas en la navegación. */
  badge?: "alertas"
}

export type NavGroup = { label: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "General",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Calendario", href: "/dashboard/calendario", icon: CalendarDays },
      { title: "Alertas", href: "/dashboard/alertas", icon: Bell, badge: "alertas" },
    ],
  },
  {
    label: "Operación",
    items: [
      { title: "Alquileres", href: "/dashboard/alquileres", icon: Receipt },
      { title: "Devoluciones", href: "/dashboard/devoluciones", icon: Undo2 },
      { title: "Reservas", href: "/dashboard/reservas", icon: CalendarRange },
      { title: "Clientes", href: "/dashboard/clientes", icon: Users },
    ],
  },
  {
    label: "Inventario",
    items: [
      { title: "Disfraces", href: "/dashboard/inventario", icon: Shirt },
      { title: "Movimientos", href: "/dashboard/inventario/movimientos", icon: PackageOpen },
    ],
  },
  {
    label: "Gestión",
    items: [
      { title: "Reportes", href: "/dashboard/reportes", icon: ChartColumn },
      { title: "Usuarios", href: "/dashboard/usuarios", icon: UserCog, adminOnly: true },
    ],
  },
]

/** Etiquetas para breadcrumbs (segmentos de URL). */
export const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Inicio",
  inventario: "Inventario",
  movimientos: "Movimientos",
  clientes: "Clientes",
  alquileres: "Alquileres",
  devoluciones: "Devoluciones",
  reservas: "Reservas",
  calendario: "Calendario",
  alertas: "Alertas",
  reportes: "Reportes",
  usuarios: "Usuarios",
  nuevo: "Nuevo",
  nueva: "Nueva",
  devolver: "Registrar devolución",
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard"
  if (href === "/dashboard/inventario") {
    return pathname === href || (pathname.startsWith(`${href}/`) && !pathname.startsWith(`${href}/movimientos`))
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
