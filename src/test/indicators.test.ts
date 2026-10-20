import { describe, expect, it } from "vitest";
import { calculateEma, calculateIndicators, calculateRsi, classifyMomentum, type Candle } from "@/lib/indicators";

// Wilder worksheet historical closes: https://github.com/alpharithms/data/blob/main/wilder-rsi-data.csv
const historical = [54.8, 56.8, 57.85, 59.85, 60.57, 61.1, 62.17, 60.6, 62.35, 62.15, 62.35, 61.45, 62.8, 61.37, 62.5, 62.57, 60.8, 59.37, 60.35, 62.35, 62.17, 62.55, 64.55, 64.37, 65.3, 64.42, 62.9, 61.6, 62.05, 60.05, 59.7, 60.9, 60.25, 58.27, 58.7, 57.72, 58.1, 58.2];
const candles = (n: number): Candle[] => Array.from({ length: n }, (_, i) => ({
  openTime: i * 3_600_000, closeTime: (i + 1) * 3_600_000 - 1, close: 100 + i,
}));

describe("Wilder RSI 14", () => {
  it("matches historical first and final worksheet values without intermediate rounding", () => {
    expect(calculateRsi(historical.slice(0, 15))).toBeCloseTo(74.21, 2);
    expect(calculateRsi(historical)).toBeCloseTo(44.52, 2);
  });
  it("requires 14 changes, not 14 closes", () => expect(calculateRsi(historical.slice(0, 14))).toBeNull());
  it("handles all gains", () => expect(calculateRsi(Array.from({ length: 20 }, (_, i) => i + 1))).toBe(100));
  it("handles all losses", () => expect(calculateRsi(Array.from({ length: 20 }, (_, i) => 20 - i))).toBe(0));
  it("handles flat history as neutral", () => expect(calculateRsi(Array(20).fill(10))).toBe(50));
  it("rejects invalid prices", () => expect(calculateRsi([...historical, NaN])).toBeNull());
});

describe("EMA", () => {
  it("seeds EMA20 with the first 20-close average", () => expect(calculateEma(Array.from({ length: 20 }, (_, i) => i + 1), 20)).toBe(10.5));
  it("seeds EMA50 with the first 50-close average", () => expect(calculateEma(Array.from({ length: 50 }, (_, i) => i + 1), 50)).toBe(25.5));
  it("smooths the next EMA20 close with 2/21", () => expect(calculateEma(Array.from({ length: 21 }, (_, i) => i + 1), 20)).toBeCloseTo(11.5, 10));
  it("does not invent EMA50 with fewer than 50 candles", () => expect(calculateEma(historical, 50)).toBeNull());
});

describe("ALTS Momentum", () => {
  it("includes RSI 50–68 for entry", () => {
    expect(classifyMomentum(50, 110, 105, 100, 1)).toBe("ENTRY");
    expect(classifyMomentum(68, 110, 105, 100, 1)).toBe("ENTRY");
  });
  it("requires close strictly above EMA20", () => expect(classifyMomentum(60, 105, 105, 100, 1)).toBe("NONE"));
  it("requires EMA20 strictly above EMA50", () => expect(classifyMomentum(60, 110, 100, 100, 1)).toBe("NONE"));
  it("requires positive 24h change", () => expect(classifyMomentum(60, 110, 105, 100, 0)).toBe("NONE"));
  it("watches RSI 45–50 and 68–75 when any positive condition exists", () => {
    for (const rsi of [45, 50, 68, 75]) expect(classifyMomentum(rsi, 90, 95, 100, 1)).toBe("WATCH");
  });
  it("does not watch without positive momentum", () => expect(classifyMomentum(48, 90, 95, 100, -1)).toBe("NONE"));
  it("returns no signal in other RSI ranges", () => {
    expect(classifyMomentum(44.99, 110, 105, 100, 1)).toBe("NONE");
    expect(classifyMomentum(75.01, 110, 105, 100, 1)).toBe("NONE");
  });
});

describe("closed hourly history", () => {
  it("excludes the unclosed candle from all confirmed indicators", () => {
    const history = candles(51);
    const now = 50 * 3_600_000;
    expect(calculateIndicators(history, now)).toEqual(calculateIndicators(history.slice(0, 50), now));
    expect(calculateIndicators(history, now)?.close).toBe(149);
  });
  it("requires at least 50 closed candles", () => expect(calculateIndicators(candles(49), 100 * 3_600_000)).toBeNull());
  it("uses 24h change between closed hourly candles", () => {
    const result = calculateIndicators(candles(50), 50 * 3_600_000);
    expect(result?.change24h).toBeCloseTo((149 / 125 - 1) * 100, 10);
    expect(result?.candleClosedAt).toBe(50 * 3_600_000);
  });
  it("rejects missing hourly candles", () => expect(calculateIndicators(candles(52).filter((_, i) => i !== 10), 100 * 3_600_000)).toBeNull());
});