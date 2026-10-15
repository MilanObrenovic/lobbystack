import { describe, expect, it } from "vitest";

import { currencyFractionDigits, defaultCurrencyForTimezone, formatServicePrice, isCurrencyCode } from "./index";

describe("service prices", () => {
  it("formats a price in the currency's smallest unit, without decimals it doesn't use", () => {
    expect(formatServicePrice({ type: "fixed", amountMinor: 3500, currency: "RSD" })).toBe("RSD 3,500");
    expect(formatServicePrice({ type: "fixed", amountMinor: 1250, currency: "EUR" })).toBe("EUR 12.50");
    expect(formatServicePrice({ type: "fixed", amountMinor: 4000, currency: "USD" })).toBe("USD 40");
    expect(formatServicePrice({ type: "from", amountMinor: 700, currency: "RSD" })).toBe("from RSD 700");
    expect(formatServicePrice({ type: "range", amountMinor: 700, maxAmountMinor: 1000, currency: "RSD" })).toBe("RSD 700 to RSD 1,000");
    expect(formatServicePrice({ type: "in_person" })).toBe("set in person");
  });

  it("reads each currency's decimals from Intl, except ones quoted in whole units", () => {
    expect(currencyFractionDigits("EUR")).toBe(2);
    expect(currencyFractionDigits("JPY")).toBe(0);
    expect(currencyFractionDigits("RSD")).toBe(0);
  });

  it("accepts only ISO 4217 codes", () => {
    expect(isCurrencyCode("RSD")).toBe(true);
    expect(isCurrencyCode("rsd")).toBe(false);
    expect(isCurrencyCode("dinar")).toBe(false);
  });

  it("picks a new business's currency from its timezone", () => {
    expect(defaultCurrencyForTimezone("Europe/Belgrade")).toBe("RSD");
    expect(defaultCurrencyForTimezone("Europe/Paris")).toBe("EUR");
    expect(defaultCurrencyForTimezone("America/Toronto")).toBe("CAD");
    expect(defaultCurrencyForTimezone("America/New_York")).toBe("USD");
  });
});
