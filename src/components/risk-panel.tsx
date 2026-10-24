import { useMemo, useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
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
export function RiskPanel({ asset, timeframe, days, level, ascending }: { asset: MarketAsset; timeframe: Timeframe; days: number; level: string; ascending: boolean }) {
  const ticker = asset.binanceTicker ?? "";
  const query = useQuery({ ...candleOptions(ticker, timeframe), enabled: Boolean(ticker), refetchInterval: 120_000 });
  // The same bulk request/cache used by Crypto Screener; no per-coin ticker requests.
  const quotes = useQuery({ queryKey: ["binance-tickers"], queryFn: fetchTickers, staleTime: 30_000, refetchInterval: 30_000, refetchOnWindowFocus: false, retry: false });
  const quote = riskQuote(quotes.data, ticker);
  const [mode, setMode] = useState<"candles" | "area">("candles");
  const [expanded, setExpanded] = useState<RiskLevel | null>(null);
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
  const lines = useMemo(() => result.scenarios.filter((s) => level === "all" || s.level === level).map((s) => ({ price: s.price, title: riskLabels[s.level], token: riskAppearance[s.level].token })), [result.scenarios, level]);
  const date = query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toLocaleString("ru") : "—";
  const last = result.data?.candles.at(-1);
  const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);
  return <section className="mt-4 border-t border-border pt-3" aria-label={`Анализ ${ticker}USDT`}>
    <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-between">
      <div className="min-w-0"><h2 className="truncate font-mono text-base font-semibold">{asset.name} · {ticker}USDT</h2><div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs"><span className="font-mono text-lg" data-testid="risk-current-price">{quote ? price(quote.price) : "—"} <span className="text-xs text-muted-foreground">USDT · Binance</span></span><span className="text-muted-foreground">Объём 24ч: {quote ? compact(quote.volume) : "—"} USDT</span></div></div>
      <div className="flex shrink-0 gap-1"><Button size="sm" variant={mode === "candles" ? "default" : "outline"} onClick={() => setMode("candles")}>Свечи</Button><Button size="sm" variant={mode === "area" ? "default" : "outline"} onClick={() => setMode("area")}>Область</Button></div>
    </div>
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>CoinGecko: ${price(asset.price)} USD · агрегированная цена, не база уровней</span><span>Котировка Binance: {quotes.dataUpdatedAt ? new Date(quotes.dataUpdatedAt).toLocaleTimeString("ru") : "—"}{quotes.error && quotes.data ? " · устарела" : ""}</span><span>История Binance: {date}</span></div>
    {(query.error || quotes.error || result.error) && <div role="alert" className="mb-2 flex flex-wrap items-center gap-2 text-xs text-down">{query.error?.message || quotes.error?.message || result.error}<Button variant="outline" size="sm" onClick={() => { void query.refetch(); void quotes.refetch(); }}>Повторить</Button></div>}
    <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_350px]">
      <div className="min-w-0" data-testid="risk-chart">
        {result.data?.candles.length ? <MarketChart key={`${ticker}:${timeframe}:${mode}`} data={result.data} mode={mode} levels={lines} currentPrice={quote?.price} currentPriceLabel="Текущая · Binance USDT" overview /> : <div className="flex h-[520px] items-center justify-center text-muted-foreground">{query.isPending ? "Загрузка реальной истории…" : "Нет данных"}</div>}
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border py-3 text-xs" aria-label="Легенда уровней">{riskLevels.filter((key) => level === "all" || key === level).map((key) => <span key={key} className={`flex items-center gap-2 ${riskAppearance[key].text}`}><span className={`h-0.5 w-5 shrink-0 ${riskAppearance[key].background}`} />{riskLabels[key]}</span>)}</div>
        {last && <p className="text-xs text-muted-foreground">Закрытая свеча: {price(last.close)} USDT · {new Date(last.closeTime).toLocaleString("ru")} · {result.data?.candles.length} свечей · {timeframe}</p>}
      </div>
      <div className="min-w-0 pt-2" data-testid="risk-table">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Уровни и сценарии</h3><span className="font-mono text-xs text-muted-foreground">USDT</span></div>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="pb-2 font-normal">Уровень</th><th className="pb-2 text-right font-normal">Цена</th><th className="pb-2 text-right font-normal">Рост</th><th className="pb-2 text-right font-normal">Множитель</th></tr></thead><tbody>{rows.map(({ key, scenario: s }) => <Fragment key={key}>
          <tr className="border-b border-border hover:bg-muted/40" data-level={key} data-price={s?.price} data-token={riskAppearance[key].token}>
            <td className="py-3 pr-1"><Button variant="ghost" size="sm" className={`h-auto min-h-8 justify-start gap-1 whitespace-normal px-0 text-left text-xs hover:bg-transparent ${riskAppearance[key].text}`} aria-expanded={expanded === key} onClick={() => setExpanded(expanded === key ? null : key)}>{expanded === key ? <ChevronDown className="size-3 shrink-0" /> : <ChevronRight className="size-3 shrink-0" />}<span>{riskLabels[key]}<span className="mt-0.5 block text-[10px] text-muted-foreground">{key === "conservative" || key === "moderate" ? "Исторический" : "Сценарий"}</span></span></Button></td>
            <td className="whitespace-nowrap pl-1 text-right font-mono">{s ? price(s.price) : "—"}</td><td className="whitespace-nowrap pl-2 text-right font-mono text-up">{s ? `+${s.growth.toFixed(1)}%` : "—"}</td><td className="whitespace-nowrap pl-2 text-right font-mono">{s ? `${s.multiple.toFixed(2)}×` : "—"}</td>
          </tr>
          {expanded === key && <tr><td colSpan={4} className="border-b border-border bg-muted/30 px-2 py-3 leading-5 text-muted-foreground">{s ? <><strong className="text-foreground">{s.name} · {s.kind}</strong><p>{s.basis}</p><p>База: {quote ? price(quote.price) : "—"} USDT · Binance. Рост и множитель рассчитаны относительно этой котировки.</p></> : !quote ? "Нет текущей котировки Binance — расчётные уровни не подставляются из CoinGecko." : result.data && result.data.candles.length >= 30 ? "Нет исторического максимума выше текущей цены в выбранной истории. Уровень не подставляется искусственно." : "Нет данных: требуется минимум 30 закрытых свечей."}</td></tr>}
        </Fragment>)}</tbody></table></div>
        {result.high !== null && <p className="mt-3 text-xs leading-5 text-muted-foreground">Диапазон: {price(result.low ?? 0)} — {price(result.high)} USDT<br />σ: {((result.volatility ?? 0) * 100).toFixed(2)}% за свечу · горизонт сценария: 30 свечей</p>}
        <p className="mt-3 text-xs leading-5 text-muted-foreground">Доступно до 500 свечей: выбранный период может быть покрыт не полностью. Исторические уровни — не прогнозы; сценарии — не вероятности и не гарантированные цели. Это не инвестиционная рекомендация.</p>
      </div>
    </div>
  </section>;
}
