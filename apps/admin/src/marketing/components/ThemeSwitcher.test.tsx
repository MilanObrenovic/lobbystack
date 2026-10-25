import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { Navbar } from "@/marketing/components/Navbar"
import { ThemeSwitcher } from "@/marketing/components/ThemeSwitcher"
import { SUPPORTED_LOCALES } from "@/marketing/i18n"

describe("ThemeSwitcher", () => {
  it.each(SUPPORTED_LOCALES)("labels the toggle in %s without knowing the theme", (locale) => {
    const html = renderToStaticMarkup(<ThemeSwitcher locale={locale} />)
    expect(html).toMatch(/aria-label="[^"]+"/)
    // Both icons render and CSS picks one, so the prerendered HTML is the same for every visitor.
    expect(html).toContain("dark:hidden")
    expect(html).toContain("dark:block")
  })

  it("adds a visible label for the mobile menu", () => {
    expect(renderToStaticMarkup(<ThemeSwitcher locale="fr" withLabel />)).toContain("Thème</button>")
    expect(renderToStaticMarkup(<ThemeSwitcher locale="fr" />)).not.toContain("Thème</button>")
  })

  it("sits in the navbar of every locale, in the desktop actions and the mobile menu", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const html = renderToStaticMarkup(<Navbar locale={locale} />)
      expect(html.match(/<button[^>]*aria-label="[^"]+"[^>]*cursor-pointer/g)).toHaveLength(2)
    }
  })
})
