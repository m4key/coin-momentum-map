import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { explainChart } from "@/lib/chart-analysis.functions";
import type { MarketCandle, Timeframe } from "@/lib/binance";

export function ChartExplanation({ ticker, timeframe, candles, disabled }: { ticker: string; timeframe: Timeframe; candles: MarketCandle[]; disabled: boolean }) {
  const call = useServerFn(explainChart);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ text: string; error: string; closedAt: number } | null>(null);
  const run = async () => {
    if (pending || disabled) return;
    setPending(true);
    try { setResult(await call({ data: { ticker, timeframe, candles: candles.slice(-2000) } })); }
    catch { setResult({ text: "", error: "Объяснение недоступно. Автоматического повтора не будет.", closedAt: 0 }); }
    finally { setPending(false); }
  };
  const lastClosedAt = candles.at(-1)?.closeTime;
  return <section className="mt-3 border-t border-border pt-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-medium">AI-разбор · {ticker}USDT · {timeframe}</h2>
      <Button variant="outline" size="sm" disabled={pending || disabled || candles.length < 50} onClick={() => void run()}>{pending ? <Loader2 className="animate-spin" /> : <Sparkles />}{pending ? "Анализ…" : result?.text ? "Обновить разбор" : "Объяснить график"}</Button>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">AI Gateway · Закрытые свечи · Не инвестиционная рекомендация</p>
    {result?.error && <p role="alert" className="mt-3 text-sm text-down">{result.error}</p>}
    {result?.text && <div className="mt-4">
      <div className="mb-3 text-xs text-muted-foreground">Снимок на {new Date(result.closedAt).toLocaleString("ru-RU", { timeZone: "UTC" })} UTC{lastClosedAt !== undefined && lastClosedAt + 1 !== result.closedAt ? " · Появились новые свечи; разбор относится к предыдущему снимку." : ""}</div>
      <div className="whitespace-pre-wrap break-words text-sm leading-6" aria-live="polite">{result.text}</div>
    </div>}
  </section>;
}