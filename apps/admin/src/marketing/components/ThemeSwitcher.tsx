"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import type { Locale } from "@/marketing/i18n"
import { cn } from "@/marketing/lib/utils"

const labels = {
  en: { toggle: "Toggle theme", theme: "Theme" },
  fr: { toggle: "Changer de thème", theme: "Thème" },
  es: { toggle: "Cambiar tema", theme: "Tema" },
  sr: { toggle: "Promeni temu", theme: "Tema" },
} satisfies Record<Locale, Record<string, string>>

type ThemeSwitcherProps = {
  locale?: Locale
  /** Shows the word "Theme" next to the icon, as a row in the mobile menu. */
  withLabel?: boolean
  className?: string
}

export function ThemeSwitcher({ locale = "en", withLabel = false, className }: ThemeSwitcherProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const copy = labels[locale]
  const iconSize = withLabel ? "size-4" : "size-[18px]"

  return (
    <button
      type="button"
      aria-label={copy.toggle}
      title={copy.toggle}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        withLabel
          ? "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground"
          : "inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground",
        className
      )}
    >
      {/* Both icons render and CSS picks one, so the prerendered HTML is the same for every visitor. */}
      <Sun className={cn(iconSize, "dark:hidden")} aria-hidden="true" />
      <Moon className={cn(iconSize, "hidden dark:block")} aria-hidden="true" />
      {withLabel ? copy.theme : null}
    </button>
  )
}
