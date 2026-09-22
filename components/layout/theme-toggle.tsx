"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const next = resolvedTheme === "dark" ? "light" : "dark"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={() => setTheme(next)} aria-label="Cambiar tema">
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Modo {next === "dark" ? "oscuro" : "claro"}</TooltipContent>
    </Tooltip>
  )
}
