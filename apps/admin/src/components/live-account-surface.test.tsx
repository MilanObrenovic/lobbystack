// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LiveAccountSurface } from "./live-account-surface";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en", resolvedLanguage: "en" } }) }));
vi.mock("./account-security-forms", () => ({ AccountSecurityForms: ({ currentEmail }: { currentEmail: string | null | undefined }) => <p>{`forms:${currentEmail}`}</p> }));

const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0; vi.unstubAllGlobals(); });

const skeletons = () => document.querySelectorAll('[data-slot="skeleton"]').length;

function renderAccount(account?: unknown) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }); clients.push(client);
  if (account) client.setQueryData(["account"], account);
  else vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  render(<QueryClientProvider client={client}><LiveAccountSurface /></QueryClientProvider>);
}

describe("account loading state", () => {
  it("shows both cards as placeholders, titles, descriptions and buttons included, with no bare loading text", () => {
    renderAccount();
    for (const key of ["changeEmail", "changePassword"]) {
      expect(screen.getByText(`account.${key}.title`).className).toContain("invisible");
      expect(screen.getByText(`account.${key}.description`).className).toContain("invisible");
    }
    expect(screen.getAllByText("account.actions.change").every((element) => element.className.includes("invisible"))).toBe(true);
    // A title, a description, a value and a button for each of the two cards.
    expect(skeletons()).toBe(8);
    expect(screen.queryByText(/Loading account/)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("swaps the placeholders for the real cards once the account has loaded", () => {
    renderAccount({ user: { id: "user", email: "owner@example.invalid" }, session: { id: "session", expiresAt: "2027-01-01T00:00:00Z" }, businesses: [] });
    expect(screen.getByText("forms:owner@example.invalid")).toBeTruthy();
    expect(skeletons()).toBe(0);
  });
});
