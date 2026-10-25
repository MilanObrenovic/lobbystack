"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

// next-themes writes the saved or system theme to <html class> from a tiny
// inline script before first paint, so the prerendered HTML stays identical
// for every visitor and Cloudflare can cache it.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}
