import { describe, expect, it } from "vitest";

import { parsePriceInput } from "./live-services-surface";

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
