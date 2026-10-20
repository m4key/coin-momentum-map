import { EMA, AverageGain, AverageLoss } from "technicalindicators";

export type Momentum = "ENTRY" | "WATCH" | "NONE";
export interface Candle { openTime: number; closeTime: number; close: number }
export interface Indicators {
  rsi: number;
  ema20: number;
  ema50: number;
  close: number;
  change24h: number;
  candleClosedAt: number;
  calculatedAt: number;
  signal: Momentum;
  reasons: string[];
}

export const momentumLabel: Record<Momentum, string> = {
  ENTRY: "Потенциальный вход", WATCH: "Наблюдение", NONE: "Нет сигнала",
};

/** Wilder smoothing, seeded with the arithmetic mean of the first 14 deltas. */
export function calculateRsi(closes: number[], period = 14): number | null {
  if (!Number.isInteger(period) || period < 1 || closes.length <= period || closes.some((v) => !Number.isFinite(v) || v <= 0)) return null;
  // Use the library's Wilder averages without its RSI output rounding;
  // rounding before classification can move a value across a signal boundary.
  const gain = AverageGain.calculate({ values: closes, period }).at(-1);
  const loss = AverageLoss.calculate({ values: closes, period }).at(-1);
  if (gain === undefined || loss === undefined) return null;
  if (gain === 0 && loss === 0) return 50;
  if (loss === 0) return 100;
  return 100 - 100 / (1 + gain / loss);
}

/** EMA seeded with the SMA of the first period closes. */
export function calculateEma(closes: number[], period: number): number | null {
  if (!Number.isInteger(period) || period < 1 || closes.length < period || closes.some((v) => !Number.isFinite(v) || v <= 0)) return null;
  return EMA.calculate({ values: closes, period }).at(-1) ?? null;
}

export function classifyMomentum(rsi: number, close: number, ema20: number, ema50: number, change24h: number): Momentum {
  const above20 = close > ema20;
  const trend = ema20 > ema50;
  const positive = change24h > 0;
  if (rsi >= 50 && rsi <= 68 && above20 && trend && positive) return "ENTRY";
  if (((rsi >= 45 && rsi <= 50) || (rsi >= 68 && rsi <= 75)) && (above20 || trend || positive)) return "WATCH";
  return "NONE";
}

export function calculateIndicators(candles: Candle[], now = Date.now()): Indicators | null {
  const closed = candles.filter((c) => c.closeTime < now).sort((a, b) => a.openTime - b.openTime);
  if (closed.length < 50) return null;
  // Reject malformed, duplicated or gapped history rather than inventing a result.
  if (closed.some((c, i) => {
    const previous = closed[i - 1];
    return !Number.isFinite(c.openTime) || !Number.isFinite(c.closeTime) || c.closeTime !== c.openTime + 3_600_000 - 1 || (i > 0 && (!previous || c.openTime !== previous.openTime + 3_600_000));
  })) return null;
  const closes = closed.map((c) => c.close);
  const rsi = calculateRsi(closes);
  const ema20 = calculateEma(closes, 20);
  const ema50 = calculateEma(closes, 50);
  const last = closed.at(-1);
  const dayAgo = closed.at(-25);
  if (rsi === null || ema20 === null || ema50 === null || !last || !dayAgo) return null;
  const change24h = (last.close / dayAgo.close - 1) * 100;
  const signal = classifyMomentum(rsi, last.close, ema20, ema50, change24h);
  const reasons = [
    `RSI ${rsi.toFixed(2)}: ${rsi >= 50 && rsi <= 68 ? "в диапазоне входа 50–68" : "вне диапазона входа 50–68"}`,
    `Закрытие ${last.close > ema20 ? "выше" : "не выше"} EMA 20`,
    `EMA 20 ${ema20 > ema50 ? "выше" : "не выше"} EMA 50`,
    `Изменение по закрытиям за 24ч: ${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`,
  ];
  return { rsi, ema20, ema50, close: last.close, change24h, candleClosedAt: last.closeTime + 1, calculatedAt: now, signal, reasons };
}