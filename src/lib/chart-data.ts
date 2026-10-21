import { EMA, AverageGain, AverageLoss } from "technicalindicators";
import { TIMEFRAME_MS, type MarketCandle, type Timeframe } from "./binance";

export function chartData(candles: MarketCandle[], timeframe: Timeframe, now = Date.now()) {
  const closed = candles.filter((c) => c.closeTime < now).sort((a, b) => a.openTime - b.openTime);
  if (closed.some((c, i) => c.closeTime !== c.openTime + TIMEFRAME_MS[timeframe] - 1 || (i > 0 && c.openTime !== (closed[i - 1]?.openTime ?? 0) + TIMEFRAME_MS[timeframe]))) throw new Error("Пропуски или дубликаты в истории Binance.");
  const values = closed.map((c) => c.close);
  const ema = (period: number) => EMA.calculate({ period, values }).map((value, i) => ({ time: (closed[i + period - 1]?.openTime ?? 0) / 1000, value }));
  const gains = AverageGain.calculate({ period: 14, values });
  const losses = AverageLoss.calculate({ period: 14, values });
  const rsi = gains.map((gain, i) => {
    const loss = losses[i] ?? 0;
    return { time: (closed[i + 14]?.openTime ?? 0) / 1000, value: gain === 0 && loss === 0 ? 50 : loss === 0 ? 100 : 100 - 100 / (1 + gain / loss) };
  });
  return { candles: closed, ema20: ema(20), ema50: ema(50), rsi };
}