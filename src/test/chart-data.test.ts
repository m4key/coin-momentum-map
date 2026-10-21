import { describe, expect, it } from "vitest";
import { chartData } from "@/lib/chart-data";
import { parseCandles, TIMEFRAME_MS, type Timeframe } from "@/lib/binance";
import { calculateEma, calculateRsi } from "@/lib/indicators";

describe("real chart history", () => {
  it("reads Binance Open High Low Close and base volume without substitution", () => {
    expect(parseCandles([[0, "100", "120", "90", "110", "42.5", 899999]])[0]).toEqual({ openTime: 0, open: 100, high: 120, low: 90, close: 110, volume: 42.5, closeTime: 899999 });
  });
  for (const frame of ["15m", "1h", "4h", "1d"] as Timeframe[]) {
    it(`uses only closed ${frame} candles and matches Wilder RSI 14 and EMA 20/50`, () => {
      const duration = TIMEFRAME_MS[frame];
      const candles = Array.from({ length: 81 }, (_, i) => ({ openTime: i * duration, closeTime: (i + 1) * duration - 1, open: 100, high: 150, low: 80, close: 100 + i / 4 + Math.sin(i) * 3, volume: i + 1 }));
      const result = chartData(candles, frame, 80 * duration);
      const closes = candles.slice(0, 80).map((c) => c.close);
      expect(result.candles).toHaveLength(80);
      expect(result.ema20).toHaveLength(61);
      expect(result.ema50).toHaveLength(31);
      expect(result.rsi).toHaveLength(66);
      expect(result.rsi[0]?.time).toBe(14 * duration / 1000);
      expect(result.rsi.at(-1)?.value).toBeCloseTo(calculateRsi(closes) ?? -1, 10);
      expect(result.ema20.at(-1)?.value).toBeCloseTo(calculateEma(closes, 20) ?? -1, 10);
      expect(result.ema50.at(-1)?.value).toBeCloseTo(calculateEma(closes, 50) ?? -1, 10);
    });
  }
  it("does not fabricate indicators on short history", () => {
    const rows = parseCandles([[0, 100, 120, 90, 110, 42, 899999]]);
    expect(chartData(rows, "15m", 900000).rsi).toEqual([]);
    expect(chartData(rows, "15m", 900000).ema50).toEqual([]);
  });
  it("rejects malformed OHLC", () => {
    expect(() => parseCandles([[0, 100, 95, 90, 110, 42, 899999]])).toThrow();
  });
});