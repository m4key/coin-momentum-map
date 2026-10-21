import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { candleOptions } from "@/lib/candle-query";
import { fetchCandles, TIMEFRAME_MS, type MarketCandle, type Timeframe } from "@/lib/binance";
import { chartData } from "@/lib/chart-data";
import type { Coin } from "@/lib/coins";
import { MarketChart } from "./market-chart";

const frames: { value: Timeframe; label: string }[] = [{ value: "15m", label: "15м" }, { value: "1h", label: "1ч" }, { value: "4h", label: "4ч" }, { value: "1d", label: "1д" }];

function AnalysisHistory({ ticker, timeframe }: { ticker: string; timeframe: Timeframe }) {
  const client = useQueryClient();
  const query = useQuery({ ...candleOptions(ticker, timeframe), refetchInterval: 30_000 });
  const [older, setOlder] = useState<MarketCandle[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [exhausted, setExhausted] = useState(false);
  const result = useMemo(() => {
    try {
      const unique = new Map([...older, ...(query.data ?? [])].map((c) => [c.openTime, c]));
      return { data: chartData([...unique.values()], timeframe), error: "" };
    } catch (err) { return { data: null, error: err instanceof Error ? err.message : "Ошибка расчёта" }; }
  }, [older, query.data, timeframe]);
  const loadOlder = async () => {
    const first = result.data?.candles[0];
    if (!first || loading) return;
    setLoading(true); setHistoryError("");
    try {
      const rows = await client.fetchQuery({ queryKey: ["binance-candles", ticker, timeframe, first.openTime - 1], queryFn: () => fetchCandles(ticker, timeframe, first.openTime - 1), staleTime: Infinity, retry: false });
      setOlder((prev) => [...rows, ...prev]);
      setExhausted(rows.length < 500);
    } catch (err) { setHistoryError(err instanceof Error ? err.message : "Не удалось загрузить историю."); }
    finally { setLoading(false); }
  };
  const error = query.error?.message || result.error || historyError;
  return <>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>EMA 20 · EMA 50 · Объём ({ticker}) · RSI 14 · UTC</span>
      <span>{query.isFetching && <Loader2 className="mr-2 inline size-3 animate-spin" />} {query.dataUpdatedAt ? `Обновлено: ${new Date(query.dataUpdatedAt).toLocaleTimeString("ru-RU")}` : "Загрузка свечей…"}</span>
    </div>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-l-2 border-down bg-down/10 p-3 text-sm text-down"><span>{error}{query.data ? " Показана последняя полученная история." : ""}</span><Button variant="outline" size="sm" disabled={query.isFetching || loading} onClick={() => historyError ? void loadOlder() : void query.refetch()}>Повторить</Button></div>}
    {query.isPending && !query.isError ? <div className="flex h-[560px] items-center justify-center gap-2 text-muted-foreground"><Loader2 className="size-5 animate-spin" />Загрузка данных Binance…</div> : result.data && result.data.candles.length ? <MarketChart data={result.data} /> : <div className="py-20 text-center text-muted-foreground">Нет данных</div>}
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <Button variant="outline" size="sm" onClick={() => void loadOlder()} disabled={loading || exhausted || !result.data?.candles.length}><History className={loading ? "animate-spin" : ""} />{exhausted ? "Начало истории" : "Ранее"}</Button>
      <span>{result.data?.candles.length ?? 0} закрытых свечей · {TIMEFRAME_MS[timeframe] / 60_000} мин</span>
      {result.data && result.data.candles.length < 50 && <span>Недостаточно истории для EMA 50</span>}
    </div>
  </>;
}

export function CoinAnalysis({ coin, onClose }: { coin: Coin | null; onClose: () => void }) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  return <Dialog open={coin !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[95dvh] w-[calc(100%-24px)] max-w-6xl overflow-x-hidden overflow-y-auto p-4 sm:p-6 [&>*]:min-w-0">
      {coin && <>
        <div className="flex flex-wrap items-start justify-between gap-3 pr-6">
          <div><DialogTitle className="font-mono text-xl">{coin.name} <span className="text-sm text-muted-foreground">{coin.ticker}USDT</span></DialogTitle><DialogDescription className="mt-2">Binance Spot</DialogDescription></div>
          <div className="font-mono text-xl">${coin.price.toLocaleString("en-US", { maximumSignificantDigits: 8 })}</div>
        </div>
        <div className="flex gap-1 border-b border-border pb-3" role="group" aria-label="Таймфрейм">
          {frames.map((f) => <Button key={f.value} size="sm" variant={timeframe === f.value ? "default" : "ghost"} aria-pressed={timeframe === f.value} onClick={() => setTimeframe(f.value)}>{f.label}</Button>)}
        </div>
        <AnalysisHistory key={`${coin.ticker}:${timeframe}`} ticker={coin.ticker} timeframe={timeframe} />
      </>}
    </DialogContent>
  </Dialog>;
}