import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { candleOptions } from "@/lib/candle-query";
import { chartData } from "@/lib/chart-data";
import { riskScenarios, riskLabels, type RiskLevel } from "@/lib/risk";
import type { Timeframe } from "@/lib/binance";
import type { MarketAsset } from "@/lib/market-assets";
import { MarketChart } from "./market-chart";
import { Button } from "./ui/button";
const classes: Record<RiskLevel, string> = { conservative: "text-up", moderate: "text-primary", high: "text-down", extreme: "text-chart-4" };
export function RiskPanel({ asset, timeframe, days, level, ascending }: { asset: MarketAsset; timeframe: Timeframe; days: number; level: string; ascending: boolean }) {
  const ticker = asset.binanceTicker ?? "";
  const query = useQuery({ ...candleOptions(ticker, timeframe), enabled: Boolean(ticker), refetchInterval: 120_000 });
  const [mode, setMode] = useState<"candles" | "area">("candles");
  const result = useMemo(() => {
    try {
      const data = chartData((query.data ?? []).filter((c) => c.openTime >= Date.now() - days * 86400000), timeframe);
      return { data, ...riskScenarios(data.candles, asset.price), error: "" };
    } catch (e) { return { data: null, scenarios: [], low: null, high: null, volatility: null, warning: "", error: e instanceof Error ? e.message : "Некорректная история" }; }
  }, [query.data, days, timeframe, asset.price]);
  const rows = result.scenarios.filter((s) => level === "all" || s.level === level).sort((a, b) => ascending ? a.growth - b.growth : b.growth - a.growth);
  const date = query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toLocaleString("ru") : "—";
  const price = (n: number) => "$" + n.toLocaleString("en", { maximumSignificantDigits: 7 });
  return <section className="mt-6 border-t border-border pt-5">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="font-mono text-lg">{asset.name} · {ticker}USDT <span className="text-muted-foreground">{price(asset.price)}</span></h2><div className="flex gap-1"><Button size="sm" variant={mode === "candles" ? "default" : "ghost"} onClick={() => setMode("candles")}>Свечи</Button><Button size="sm" variant={mode === "area" ? "default" : "ghost"} onClick={() => setMode("area")}>Область</Button></div></div>
    <p className="mb-3 text-xs text-muted-foreground">История: Binance Spot USDT · Текущая цена: CoinGecko USD (может отличаться от биржи) · История обновлена: {date}</p>
    {(query.error || result.error) && <p role="alert" className="text-down">{query.error?.message || result.error}<Button variant="outline" size="sm" onClick={() => void query.refetch()}>Повторить</Button></p>}
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
      <div className="min-w-0">{result.data?.candles.length ? <MarketChart key={`${ticker}:${timeframe}:${mode}`} data={result.data} mode={mode} levels={rows.map((s) => ({ price: s.price, title: riskLabels[s.level], token: s.level === "conservative" ? "--up" : s.level === "moderate" ? "--primary" : s.level === "high" ? "--down" : "--chart-rsi" }))} currentPrice={asset.price} /> : <div className="flex h-80 items-center justify-center text-muted-foreground">{query.isPending ? "Загрузка реальной истории…" : "Нет данных"}</div>}</div>
      <div className="min-w-0"><h3 className="mb-3 font-medium">Сценарии роста</h3><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="pb-2">Риск / основание</th><th>Цена</th><th>Рост</th><th>×</th></tr></thead><tbody>{rows.map((s) => <tr key={s.level} className="border-b border-border"><td className="py-3 pr-3"><div className={classes[s.level]}>{riskLabels[s.level]}</div><div className="mt-1 font-medium">{s.name}</div><div className="mt-1 text-muted-foreground">{s.kind}</div><p className="mt-2 leading-5 text-muted-foreground">{s.basis}</p><p className="mt-1 text-muted-foreground">{date}</p></td><td className="pr-2 font-mono">{price(s.price)}</td><td className="pr-2 font-mono">+{s.growth.toFixed(1)}%</td><td className="font-mono">{s.multiple.toFixed(2)}x</td></tr>)}</tbody></table></div>
        {result.high !== null && <p className="mt-4 text-xs text-muted-foreground">Диапазон доступной истории: {price(result.low ?? 0)} — {price(result.high)} · σ: {((result.volatility ?? 0) * 100).toFixed(2)}% за свечу.</p>}
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{result.warning} История ограничена 500 свечами выбранного таймфрейма; локального максимума выше цены может не быть. Это не инвестиционная рекомендация.</p>
      </div>
    </div>
  </section>;
}