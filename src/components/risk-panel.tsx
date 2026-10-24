import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { candleOptions } from "@/lib/candle-query";
import { chartData } from "@/lib/chart-data";
import { riskScenarios, riskLabels, riskLevels, riskAppearance, type RiskLevel } from "@/lib/risk";
import { fetchTickers, type Timeframe } from "@/lib/binance";
import { riskQuote } from "@/lib/risk-quote";
import type { MarketAsset } from "@/lib/market-assets";
import { MarketChart } from "./market-chart";
import { Button } from "./ui/button";

const price = (n: number) => n.toLocaleString("en", { maximumSignificantDigits: 7 });
type RiskResult = ReturnType<typeof riskScenarios> & { data: ReturnType<typeof chartData> | null; error: string };
export function RiskPanel({ asset, timeframe, days, level, ascending, mode }: { asset: MarketAsset; timeframe: Timeframe; days: number; level: string; ascending: boolean; mode: "candles" | "area" }) {
  const ticker = asset.binanceTicker ?? "";
  const query = useQuery({ ...candleOptions(ticker, timeframe), enabled: Boolean(ticker), refetchInterval: 120_000 });
  // The same bulk request/cache used by Crypto Screener; no per-coin ticker requests.
  const quotes = useQuery({ queryKey: ["binance-tickers"], queryFn: fetchTickers, staleTime: 30_000, refetchInterval: 30_000, refetchOnWindowFocus: false, retry: false });
  const quote = riskQuote(quotes.data, ticker);
  const [chosen, setChosen] = useState<RiskLevel>("moderate");
  const result = useMemo<RiskResult>(() => {
    try {
      const data = chartData((query.data ?? []).filter((c) => c.openTime >= Date.now() - days * 86400000), timeframe);
      return { data, ...riskScenarios(data.candles, quote?.price ?? NaN), error: "" };
    } catch (e) { return { data: null, scenarios: [], low: null, high: null, volatility: null, warning: "", error: e instanceof Error ? e.message : "Некорректная история" }; }
  }, [query.data, days, timeframe, quote?.price]);
  const rows = riskLevels.filter((key) => level === "all" || key === level).map((key) => ({ key, scenario: result.scenarios.find((s) => s.level === key) })).sort((a, b) => {
    if (!a.scenario) return b.scenario ? 1 : 0;
    if (!b.scenario) return -1;
    return ascending ? a.scenario.growth - b.scenario.growth : b.scenario.growth - a.scenario.growth;
  });
  const selectedKey = rows.some((r) => r.key === chosen) ? chosen : rows[0]?.key;
  const selected = result.scenarios.find((s) => s.level === selectedKey);
  const lines = useMemo(() => result.scenarios.filter((s) => level === "all" || s.level === level).map((s) => ({ price: s.price, title: riskLabels[s.level], token: riskAppearance[s.level].token, selected: s.level === selectedKey })), [result.scenarios, level, selectedKey]);
  const date = query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toLocaleString("ru") : "—";
  const last = result.data?.candles.at(-1);
  const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);
  return <section className="mt-3" aria-label={`Анализ ${ticker}USDT`}>
    {(query.error || quotes.error || result.error) && <div role="alert" className="mb-2 flex flex-wrap items-center gap-2 text-xs text-down">{query.error?.message || quotes.error?.message || result.error}<Button variant="outline" size="sm" onClick={() => { void query.refetch(); void quotes.refetch(); }}>Повторить</Button></div>}
    <div className="grid min-w-0 items-start gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(230px,1fr)]">
      <div className="min-w-0" data-testid="risk-chart">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-y border-border py-2 text-xs">
          <div className="min-w-0"><h2 className="truncate font-mono font-semibold">{asset.name} · {ticker}USDT</h2><span className="text-muted-foreground">Binance Spot · {timeframe}</span></div>
          <span className="shrink-0 text-right font-mono" data-testid="risk-current-price">{quote ? price(quote.price) : "—"}<span className="block text-[10px] text-muted-foreground">USDT · текущая цена</span></span>
        </div>
        {result.data?.candles.length ? <MarketChart key={`${ticker}:${timeframe}:${mode}`} data={result.data} mode={mode} levels={lines} {...(quote ? { currentPrice: quote.price } : {})} currentPriceLabel="Текущая · Binance USDT" overview /> : <div className="flex h-[640px] items-center justify-center text-muted-foreground">{query.isPending ? "Загрузка реальной истории…" : "Нет данных"}</div>}
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border py-3 text-[10px]" aria-label="Легенда уровней">{riskLevels.filter((key) => level === "all" || key === level).map((key) => <span key={key} className={`flex items-center gap-1.5 ${riskAppearance[key].text}`}><span className={`h-0.5 w-4 shrink-0 ${riskAppearance[key].background}`} />{riskLabels[key]} · {key === "conservative" ? "локальный максимум" : key === "moderate" ? "максимум периода" : key === "high" ? "2σ" : "3σ"}</span>)}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] leading-4 text-muted-foreground"><span>История: {date} · {result.data?.candles.length ?? 0} закрытых свечей</span><span>Котировка: {quotes.dataUpdatedAt ? new Date(quotes.dataUpdatedAt).toLocaleTimeString("ru") : "—"}{quotes.error && quotes.data ? " · устарела" : ""}</span>{last && <span>Закрытие: {price(last.close)} USDT · {new Date(last.closeTime).toLocaleString("ru")}</span>}</div>
      </div>
      <aside className="min-w-0 border-t border-border lg:border-l lg:pl-3" data-testid="risk-table">
        <h3 className="py-3 text-xs font-semibold">Цена {ticker} при риске</h3>
        <div className="border-y border-border py-3" data-testid="risk-selected-scenario" data-price={selected?.price} data-level={selectedKey}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><span className={`min-w-0 text-xs ${selectedKey ? riskAppearance[selectedKey].text : ""}`}>{selectedKey ? riskLabels[selectedKey] : "—"}</span><span className="shrink-0 font-mono text-lg text-up">{selected ? `+${selected.growth.toFixed(1)}%` : "—"}</span></div>
          <div className="mt-1 font-mono text-base">{selected ? price(selected.price) : "—"} <span className="text-[10px] text-muted-foreground">USDT</span></div>
          <p className="mt-1 text-[10px] text-muted-foreground">{selected?.kind ?? "Нет обоснованного уровня"}</p>
        </div>
        <table className="w-full table-fixed text-[11px]"><thead><tr className="text-left text-muted-foreground"><th className="w-[46%] py-3 font-normal">Риск</th><th className="w-[30%] py-3 text-right font-normal">Цена</th><th className="w-[24%] py-3 text-right font-normal">Изм.</th></tr></thead><tbody>{rows.map(({ key, scenario: s }) => <tr key={key} className={`border-b border-border ${key === selectedKey ? "bg-accent" : "hover:bg-muted/40"}`} data-level={key} data-price={s?.price} data-token={riskAppearance[key].token} aria-selected={key === selectedKey}>
          <td className="py-1"><Button variant="ghost" size="sm" className={`h-auto min-h-10 w-full justify-start whitespace-normal px-1 text-left text-[11px] ${riskAppearance[key].text}`} aria-pressed={key === selectedKey} onClick={() => setChosen(key)}><span>{riskLabels[key]}<span className="mt-0.5 block text-[9px] text-muted-foreground">{key === "conservative" || key === "moderate" ? "Исторический" : "Сценарий"}</span></span></Button></td>
          <td className="pr-1 text-right font-mono" data-testid="risk-row-price">{s ? price(s.price) : "—"}</td><td className="text-right font-mono text-up">{s ? `+${s.growth.toFixed(1)}%` : "—"}</td>
        </tr>)}</tbody></table>
        <details className="mt-3 text-[11px] leading-5 text-muted-foreground"><summary className="cursor-pointer font-medium text-foreground">Методика и ограничения</summary>
          <div className="mt-2" data-testid="risk-methodology">{selected ? <><strong className="text-foreground">{selected.name}</strong><p>{selected.basis}</p><p>База: {quote ? price(quote.price) : "—"} USDT · Binance. Множитель: {selected.multiple.toFixed(2)}×.</p></> : <p>{!quote ? "Нет текущей котировки Binance; CoinGecko не используется вместо неё." : "Нет обоснованного уровня: требуется 30 закрытых свечей и исторический максимум выше текущей цены."}</p>}
          {result.high !== null && <p className="mt-2">Диапазон: {price(result.low ?? 0)} — {price(result.high)} USDT. σ: {((result.volatility ?? 0) * 100).toFixed(2)}% за свечу. Горизонт: 30 свечей.</p>}
          <p className="mt-2">До 500 свечей; период может быть покрыт не полностью. Числовая шкала риска 0–1 не рассчитывается этой методикой. Исторические уровни — не прогнозы; сценарии — не вероятности.</p>
          <p className="mt-2">CoinGecko: ${price(asset.price)} USD · агрегированная цена, не база уровней. Объём Binance 24ч: {quote ? compact(quote.volume) : "—"} USDT.</p></div>
        </details>
        <p className="mt-4 text-[10px] leading-4 text-muted-foreground">Условные уровни, не гарантированные цели. Не инвестиционная рекомендация.</p>
      </aside>
    </div>
  </section>;
}
