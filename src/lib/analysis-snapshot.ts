import { z } from "zod";
import { chartData } from "./chart-data";

export const analysisInput = z.object({
  ticker: z.string().regex(/^[A-Z0-9]{1,24}$/),
  timeframe: z.enum(["15m", "1h", "4h", "1d"]),
  candles: z.array(z.object({
    openTime: z.number().int().nonnegative(), closeTime: z.number().int().nonnegative(),
    open: z.number().positive().finite(), high: z.number().positive().finite(), low: z.number().positive().finite(), close: z.number().positive().finite(), volume: z.number().nonnegative().finite(),
  }).refine((c) => c.high >= Math.max(c.open, c.close, c.low) && c.low <= Math.min(c.open, c.close), "Некорректные OHLC")).min(50).max(2000),
});
export type AnalysisInput = z.infer<typeof analysisInput>;

export function analysisSnapshot(input: AnalysisInput, now = Date.now()) {
  const data = chartData(input.candles, input.timeframe, now);
  const last = data.candles.at(-1);
  const rsi = data.rsi.at(-1)?.value, ema20 = data.ema20.at(-1)?.value, ema50 = data.ema50.at(-1)?.value;
  if (!last || rsi === undefined || ema20 === undefined || ema50 === undefined) throw new Error("Недостаточно закрытых свечей для анализа.");
  return {
    pair: input.ticker + "USDT", timeframe: input.timeframe, source: "Binance Spot — снимок данных приложения",
    candlesCount: data.candles.length, firstOpenTime: data.candles[0]?.openTime,
    lastClosedAt: last.closeTime + 1, generatedAt: now,
    close: last.close, rsi14: rsi, ema20, ema50,
    recentCandles: data.candles.slice(-60),
    limitations: ["Только закрытые свечи", "Без новостей, стакана и других бирж", "Индикаторы запаздывают", "Нет прогноза доходности"],
  };
}