// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AccountSecurityForms } from "./account-security-forms";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string, options?: { email?: string }) => (options?.email ? `${key}:${options.email}` : key) }) }));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(Response.json({}));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function openEmailDialog() {
  render(<AccountSecurityForms currentEmail="owner@example.com" />);
  await userEvent.click(screen.getAllByRole("button", { name: "account.actions.change" })[0]!);
  return await screen.findByLabelText("account.changeEmail.newEmailPlaceholder");
}
const send = () => userEvent.click(screen.getByRole("button", { name: "account.changeEmail.save" }));

describe("change email dialog", () => {
  it("shows the current email in a disabled field and keeps sending enabled", async () => {
    await openEmailDialog();
    expect((screen.getByLabelText("account.changeEmail.currentEmailLabel") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("account.changeEmail.currentEmailLabel") as HTMLInputElement).value).toBe("owner@example.com");
    expect((screen.getByRole("button", { name: "account.changeEmail.save" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText("account.changeEmail.errors.required")).toBeNull();
  });

  it("marks the field invalid under the input after a send attempt, without calling the server", async () => {
    const input = await openEmailDialog();
    await send();
    expect(await screen.findByText("account.changeEmail.errors.required")).toBeTruthy();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(screen.getByText("account.changeEmail.errors.required").id);
    await userEvent.type(input, "not-an-email");
    expect(screen.getByText("account.changeEmail.errors.invalid")).toBeTruthy();
    await userEvent.clear(input);
    await userEvent.type(input, " Owner@Example.com ");
    expect(screen.getByText("account.changeEmail.errors.unchanged")).toBeTruthy();
    await send();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the trimmed address and closes", async () => {
    const input = await openEmailDialog();
    await userEvent.type(input, "  new@example.com ");
    await send();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/auth/change-email", expect.objectContaining({ body: JSON.stringify({ newEmail: "new@example.com", callbackURL: "/settings/account?emailChanged=true" }) })));
    await waitFor(() => expect(screen.queryByLabelText("account.changeEmail.newEmailPlaceholder")).toBeNull());
    expect(screen.getByText("account.changeEmail.confirmationSent:new@example.com")).toBeTruthy();
  });

  it("shows the server's refusal under the field", async () => {
    fetchMock.mockResolvedValue(Response.json({ message: "An account with that email already exists." }, { status: 400 }));
    const input = await openEmailDialog();
    await userEvent.type(input, "taken@example.com");
    await send();
    expect(await screen.findByText("An account with that email already exists.")).toBeTruthy();
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("clears what was typed and any error when cancelled", async () => {
    const input = await openEmailDialog();
    await userEvent.type(input, "x");
    await send();
    await userEvent.click(screen.getByRole("button", { name: "account.actions.cancel" }));
    await waitFor(() => expect(screen.queryByLabelText("account.changeEmail.newEmailPlaceholder")).toBeNull());
    await userEvent.click(screen.getAllByRole("button", { name: "account.actions.change" })[0]!);
    const reopened = await screen.findByLabelText("account.changeEmail.newEmailPlaceholder") as HTMLInputElement;
    expect(reopened.value).toBe("");
    expect(screen.queryByText("account.changeEmail.errors.invalid")).toBeNull();
  });
});
