"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { BrandMark, BrandName } from "@/components/brand"
import { NavUser } from "@/components/layout/nav-user"
import { isActivePath, NAV_GROUPS } from "@/components/layout/nav-config"
import { useSession } from "@/components/session-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAlertas } from "@/hooks/use-alertas"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { isAdmin } = useSession()
  const { setOpenMobile } = useSidebar()
  const { data: alertas } = useAlertas()
  const alertasAltas = alertas?.filter((a) => a.severidad === "alta").length ?? 0
  const totalAlertas = alertas?.length ?? 0

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="ZquiDisfraces">
              <Link href="/dashboard" onClick={() => setOpenMobile(false)}>
                <BrandMark />
                <div className="grid flex-1 text-left leading-tight">
                  <BrandName />
                  <span className="truncate text-xs text-muted-foreground">Alquiler de disfraces</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => !item.adminOnly || isAdmin)
          if (!items.length) return null
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActivePath(pathname, item.href)} tooltip={item.title}>
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge === "alertas" && totalAlertas > 0 && (
                      <SidebarMenuBadge
                        className={
                          alertasAltas > 0
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        }
                      >
                        {totalAlertas}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
