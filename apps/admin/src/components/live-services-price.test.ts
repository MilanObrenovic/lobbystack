import { describe, expect, it } from "vitest";

import { parsePriceInput, readPrice } from "./live-services-surface";

const values = { name: "Haircut", description: "", durationMinutes: "30", price: "", priceMax: "", active: true };

describe("readPrice", () => {
  it("reads each price type from the editor's fields", () => {
    expect(readPrice({ ...values, priceType: "fixed", price: "700" }, "RSD")).toEqual({ priceType: "fixed", priceMinor: 700, priceMaxMinor: null });
    expect(readPrice({ ...values, priceType: "from", price: "1.000" }, "RSD")).toEqual({ priceType: "from", priceMinor: 1000, priceMaxMinor: null });
    expect(readPrice({ ...values, priceType: "range", price: "700", priceMax: "1000" }, "RSD")).toEqual({ priceType: "range", priceMinor: 700, priceMaxMinor: 1000 });
    expect(readPrice({ ...values, priceType: "in_person", price: "700" }, "RSD")).toEqual({ priceType: "in_person", priceMinor: null, priceMaxMinor: null });
    expect(readPrice({ ...values, priceType: "fixed" }, "RSD")).toEqual({ priceType: "fixed", priceMinor: null, priceMaxMinor: null });
  });

  it("refuses a range missing a bound or with its bounds the wrong way round", () => {
    expect(readPrice({ ...values, priceType: "range", price: "700" }, "RSD")).toEqual({ error: "rangeIncomplete" });
    expect(readPrice({ ...values, priceType: "range", price: "1000", priceMax: "700" }, "RSD")).toEqual({ error: "rangeOrder" });
  });
});

describe("parsePriceInput", () => {
  it("reads whole-unit currencies with any grouping", () => {
    expect(parsePriceInput("3500", "RSD")).toBe(3500);
    expect(parsePriceInput("3.500", "RSD")).toBe(3500);
    expect(parsePriceInput("3,500", "RSD")).toBe(3500);
    expect(parsePriceInput("3 500", "RSD")).toBe(3500);
  });

  it("reads a final comma or point as decimals in currencies that have them", () => {
    expect(parsePriceInput("12,50", "EUR")).toBe(1250);
    expect(parsePriceInput("12.5", "EUR")).toBe(1250);
    expect(parsePriceInput("1.234,56", "EUR")).toBe(123456);
    expect(parsePriceInput("1,234.56", "USD")).toBe(123456);
    expect(parsePriceInput("40", "USD")).toBe(4000);
  });

  it("treats empty as no price and rejects anything that isn't one", () => {
    expect(parsePriceInput("  ", "RSD")).toBeNull();
    expect(parsePriceInput("-5", "RSD")).toBeUndefined();
    expect(parsePriceInput("abc", "EUR")).toBeUndefined();
    expect(parsePriceInput("12.345", "JPY")).toBe(12345);
  });
});
