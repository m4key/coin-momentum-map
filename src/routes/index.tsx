import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { filterCoins, sortCoins, type ChangeFilter, type Signal, type SortKey } from "@/lib/coins";
import { BinanceError, buildCoins, fetchSymbols, fetchTickers } from "@/lib/binance";
import { useIndicators } from "@/hooks/use-indicators";
import { momentumLabel } from "@/lib/indicators";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
import { CoinAnalysis } from "@/components/coin-analysis";
import { useMarkets } from "@/hooks/use-markets";
import { selectTopAssets } from "@/lib/market-assets";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Crypto Metrics — топ-200 криптовалют" },
      { name: "description", content: "Топ-200 CoinGecko и графики Binance Spot: реальные котировки, часовой RSI 14, EMA 20/50 и исследовательский ALTS Momentum." },
      { property: "og:title", content: "Crypto Metrics — топ-200 криптовалют" },
      { property: "og:description", content: "Анализ альткоинов и поиск торговых возможностей." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const usd = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: n < 0.01 ? Math.min(12, Math.max(6, Math.ceil(-Math.log10(n)) + 3)) : n < 10 ? 4 : 2 });
const compact = (n: number) =>
  "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

const COLUMNS: { key: SortKey; label: string; align?: string }[] = [
  { key: "name", label: "Монета" },
  { key: "price", label: "Цена", align: "text-right" },
  { key: "change24h", label: "24ч", align: "text-right" },
  { key: "volume24h", label: "Объём 24ч · рынок", align: "text-right" },
  { key: "marketCap", label: "Капитализация", align: "text-right" },
  { key: "rsi", label: "RSI 14 · 1ч", align: "text-right" },
  { key: "ema20", label: "EMA 20 · 1ч", align: "text-right" },
  { key: "ema50", label: "EMA 50 · 1ч", align: "text-right" },
  { key: "signal", label: "ALTS Momentum", align: "text-right" },
];

const signalClass: Record<Signal, string> = {
  ENTRY: "bg-up/15 text-up border-up/30",
  WATCH: "bg-primary/15 text-primary border-primary/30",
  NONE: "bg-muted text-muted-foreground border-border",
};

function rsiClass(r: number) {
  return r >= 70 ? "text-down" : r <= 30 ? "text-up" : "text-foreground";
}

function Index() {
  const [q, setQ] = useState("");
  const [change, setChange] = useState<ChangeFilter>("all");
  const [signal, setSignal] = useState<Signal | "all" | "missing">("all");
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [manualExclusions, setManualExclusions] = useState("");
  const marketsQuery = useMarkets();
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const retry = (n: number, err: Error) => !(err instanceof BinanceError && err.kind === "rate_limit") && n < 1;
  // Pair list changes rarely: load once, refresh hourly.
  const symbolsQuery = useQuery({
    queryKey: ["binance-symbols"],
    queryFn: fetchSymbols,
    staleTime: 60 * 60_000,
    refetchInterval: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry,
  });
  const tickersQuery = useQuery({
    queryKey: ["binance-tickers"],
    queryFn: fetchTickers,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    enabled: !!symbolsQuery.data,
    retry,
  });
  const failed = symbolsQuery.isError ? symbolsQuery : tickersQuery;
  const query = {
    isFetching: symbolsQuery.isFetching || tickersQuery.isFetching,
    isPending: symbolsQuery.isPending || tickersQuery.isPending,
    isError: symbolsQuery.isError || tickersQuery.isError,
    error: failed.error,
    dataUpdatedAt: tickersQuery.dataUpdatedAt,
    refetch: () => (symbolsQuery.isError ? symbolsQuery.refetch() : tickersQuery.refetch()),
  };

  const market = useMemo(() => selectTopAssets(marketsQuery.data?.assets ?? [], [], manualExclusions.split(",").map((id) => id.trim())), [marketsQuery.data, manualExclusions]);
  const active = new Set(symbolsQuery.data?.filter((s) => s.quoteAsset === "USDT" && s.status === "TRADING" && s.isSpotTradingAllowed !== false).map((s) => s.baseAsset));
  const matched = market.filter((c) => c.binanceTicker && active.has(c.binanceTicker)).map((c) => ({ ...c, ticker: c.binanceTicker ?? c.ticker }));
  const indicatorQueries = useIndicators(matched);
  const live = market.map((coin) => {
    const index = matched.findIndex((c) => c.id === coin.id);
    const result = index >= 0 ? indicatorQueries[index] : undefined;
    const indicators = result?.isError ? null : result?.data;
    const current = indicators && Date.now() < indicators.candleClosedAt + 3_600_000 + 60_000 ? indicators : null;
    return { ...coin, indicators: current, rsi: current?.rsi ?? null, ema20: current?.ema20 ?? null, ema50: current?.ema50 ?? null, signal: current?.signal ?? null, indicatorError: index < 0 ? "Нет подтверждённого соответствия Binance USDT; подстановка по похожему тикеру запрещена." : result?.error?.message ?? "Загрузка часовых свечей…" };
  });
  const computed = live.flatMap((c) => c.indicators ? [c.indicators] : []);
  const calculationTime = computed.length ? new Date(Math.max(...computed.map((c) => c.calculatedAt))).toLocaleTimeString("ru-RU") : null;
  const indicatorFailures = indicatorQueries.filter((result) => result.isError).length;
  const indicatorsFetching = indicatorQueries.some((result) => result.isFetching);

  const rows = useMemo(
    () => sortCoins(filterCoins(live, q, change, signal), sortKey, dir),
    [live, q, change, signal, sortKey, dir],
  );

  const n = live.length || 1;
  const totalVol = live.reduce((s, c) => s + c.volume24h, 0);
  const avgChange = live.reduce((s, c) => s + c.change24h, 0) / n;
  const gainers = live.filter((c) => c.change24h >= 0).length;
  const avgRsi = computed.length ? computed.reduce((s, c) => s + c.rsi, 0) / computed.length : null;
  const hasData = live.length > 0;
  const updatedAt = marketsQuery.data?.fetchedAt ? new Date(marketsQuery.data.fetchedAt).toLocaleTimeString("ru-RU") : null;

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setDir(k === "name" ? "asc" : "desc");
    }
  };

  const dash = "—";
  const summary = [
    { label: "Объём 24ч · рынок", value: hasData ? compact(totalVol) : dash },
    {
      label: "Среднее изменение",
      value: hasData ? pct(avgChange) : dash,
      cls: hasData ? (avgChange >= 0 ? "text-up" : "text-down") : "",
    },
    { label: "Растут / падают", value: hasData ? `${gainers} / ${live.length - gainers}` : dash },
    { label: "Средний RSI 14 · 1ч", value: avgRsi !== null ? avgRsi.toFixed(1) : dash },
  ];

  const selectCls =
    "h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-primary" />
              <h1 className="font-mono text-2xl font-semibold tracking-tight">Crypto Metrics</h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {query.isFetching && (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
              <span>Данные CoinGecko</span>
              <span>·</span>
              <span>{updatedAt ? `Обновлено: ${updatedAt}` : "Загрузка…"}</span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {summary.map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <div className={`mt-1 font-mono text-lg font-semibold ${s.cls ?? ""}`}>{s.value}</div>
              </div>
            ))}
          </div>
        </header>

        {(marketsQuery.data?.error || marketsQuery.isError) && <div role="alert" className="mb-4 border-l-2 border-down bg-down/10 p-3 text-sm text-down">{marketsQuery.data?.error || "Не удалось получить CoinGecko"}<Button variant="outline" size="sm" className="ml-3" onClick={() => void marketsQuery.refetch()}>Повторить</Button></div>}
        <div className="mb-4 space-y-2 text-xs text-muted-foreground">
          <p>Акции и токенизированные ETF исключаются по категориям CoinGecko и списку ID. {marketsQuery.data?.classificationComplete ? "Категории загружены." : "Категории недоступны; действует дополнительный список исключений."} Полнота классификации не гарантируется.</p>
          <input aria-label="Ручные исключения" placeholder="Исключить ID CoinGecko через запятую" value={manualExclusions} onChange={(e) => setManualExclusions(e.target.value)} className="h-8 w-full rounded border border-border bg-card px-3 sm:max-w-md" />
        </div>
        {query.isError && (
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-down/40 bg-down/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium text-down">Не удалось обновить данные Binance</div>
              <div className="text-muted-foreground">
                {query.error instanceof Error ? query.error.message : "Неизвестная ошибка."}
                {hasData && updatedAt ? ` Показаны последние полученные данные от ${updatedAt}.` : ""}
              </div>
            </div>
            <Button variant="outline"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className="h-9 rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {query.isFetching ? "Загрузка…" : "Повторить"}
            </Button>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-live="polite">
          <span>Индикаторы 1ч: {computed.length} / {market.length}{indicatorsFetching ? " · Загрузка…" : ""}</span>
          <span>Последний расчёт: {calculationTime ?? "Нет данных"}</span>
          {indicatorFailures > 0 && <>
            <span className="text-down">Нет данных для {indicatorFailures} монет</span>
            <Button variant="outline" size="sm" disabled={indicatorsFetching} onClick={() => indicatorQueries.filter((result) => result.isError).forEach((result) => void result.refetch())}>Повторить расчёт</Button>
          </>}
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Монет в таблице: <span className="font-mono text-foreground">{rows.length}</span>
            {hasData && rows.length !== live.length && <> из <span className="font-mono">{live.length}</span></>}
            <span className="ml-2 text-xs">(топ-200 по капитализации)</span>
          </span>
          <select
            aria-label="Сортировка"
            value={`${sortKey}:${dir}`}
            onChange={(e) => {
              const [k, d] = e.target.value.split(":") as [SortKey, "asc" | "desc"];
              setSortKey(k);
              setDir(d);
            }}
            className={selectCls}
          >
            <option value="marketCap:desc">Капитализация: по убыванию</option>
            <option value="marketCap:asc">Капитализация: по возрастанию</option>
            <option value="volume24h:desc">Объём: по убыванию</option>
            <option value="volume24h:asc">Объём: по возрастанию</option>
            <option value="change24h:desc">Изменение 24ч: лидеры роста</option>
            <option value="change24h:asc">Изменение 24ч: лидеры падения</option>
            {!["marketCap", "volume24h", "change24h"].includes(sortKey) && (
              <option value={`${sortKey}:${dir}`}>Другая сортировка (по столбцу)</option>
            )}
          </select>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по названию или тикеру"
            className={`${selectCls} min-h-10 sm:flex-1 placeholder:text-muted-foreground`}
          />
          <select value={change} onChange={(e) => setChange(e.target.value as ChangeFilter)} className={selectCls}>
            <option value="all">Любое изменение</option>
            <option value="up">Только рост</option>
            <option value="down">Только падение</option>
          </select>
          <select aria-label="ALTS Momentum" value={signal} onChange={(e) => setSignal(e.target.value as Signal | "all" | "missing")} className={selectCls}>
            <option value="all">Все сигналы</option>
            <option value="ENTRY">Потенциальный вход</option>
            <option value="WATCH">Наблюдение</option>
            <option value="NONE">Нет сигнала</option>
            <option value="missing">Нет данных</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border">
                {COLUMNS.map((c) => (
                  <th key={c.key} className={`px-4 py-3 font-medium ${c.align ?? "text-left"}`}>
                    <Button variant="ghost"
                      onClick={() => toggleSort(c.key)}
                      className={`h-auto p-0 inline-flex items-center gap-1 text-xs uppercase tracking-wider transition-colors hover:bg-transparent hover:text-foreground ${
                        sortKey === c.key ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {c.label}
                      <span className="w-3">{sortKey === c.key ? (dir === "asc" ? "▲" : "▼") : ""}</span>
                    </Button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2"><img src={c.image} alt="" className="size-6 rounded-full" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} /><span className="font-medium">{c.name}</span></div>
                    <Button variant="link" className="h-auto p-0 font-mono text-xs text-muted-foreground hover:text-primary" disabled={!c.binanceTicker || !active.has(c.binanceTicker)} title={!c.binanceTicker ? "Нет подтверждённой пары Binance" : "График"} aria-label={`График ${c.binanceTicker ?? c.ticker}USDT`} onClick={() => setSelectedTicker(c.id)}>{c.ticker}</Button>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{usd(c.price)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${c.change24h >= 0 ? "text-up" : "text-down"}`}>
                    {pct(c.change24h)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{compact(c.volume24h)}</td>
                  <td className="px-4 py-3 text-right font-mono">{compact(c.marketCap)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${c.rsi !== null ? rsiClass(c.rsi) : "text-muted-foreground"}`}>{c.rsi !== null ? c.rsi.toFixed(2) : "Нет данных"}</td>
                  <td className="px-4 py-3 text-right font-mono">{c.ema20 !== null ? usd(c.ema20) : "Нет данных"}</td>
                  <td className="px-4 py-3 text-right font-mono">{c.ema50 !== null ? usd(c.ema50) : "Нет данных"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${c.signal ? signalClass[c.signal] : "border-border text-muted-foreground"}`}>
                        {c.signal ? momentumLabel[c.signal] : "Нет данных"}
                      </span>
                      <Popover>
                        <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" aria-label={`Причины сигнала ${c.ticker}`} title="Причины сигнала"><Info /></Button></PopoverTrigger>
                        <PopoverContent className="max-w-[calc(100vw-32px)] bg-card text-foreground text-xs" align="end">
                          <div className="mb-2 font-medium">{c.ticker} · {c.signal ? momentumLabel[c.signal] : "Нет данных"}</div>
                          {c.indicators ? <>
                            <ul className="space-y-1">{c.indicators.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                            <div className="mt-3 border-t border-border pt-2 text-muted-foreground">
                              <div>Закрытие свечи: {new Date(c.indicators.candleClosedAt).toLocaleString("ru-RU")}</div>
                              <div>Расчёт: {new Date(c.indicators.calculatedAt).toLocaleString("ru-RU")}</div>
                            </div>
                          </> : <p>{c.indicatorError}</p>}
                        </PopoverContent>
                      </Popover>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    {marketsQuery.isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Загрузка CoinGecko…
                      </span>
                    ) : !hasData ? (
                      "Нет данных: источник недоступен."
                    ) : (
                      "Ничего не найдено"
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Цена, изменение, объём рынка и капитализация — CoinGecko (USD), обновление каждые 2 минуты; это не объём одной биржи. Графики — только подтверждённые пары Binance Spot USDT.
          RSI 14 (Уайлдер), EMA 20/50 и ALTS Momentum — по закрытым часовым свечам, обновление после закрытия часа.
          Изменение за 24ч для сигнала считается между закрытиями свечей, а не по текущей котировке.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Потенциальный вход: RSI 50–68, закрытие выше EMA 20, EMA 20 выше EMA 50, изменение за 24ч положительное.
          Наблюдение: RSI 45–50 или 68–75 и хотя бы одно из этих трёх условий импульса, если вход не подтверждён.
          Остальные случаи — нет сигнала. ALTS Momentum — исследовательская гипотеза, не торговая рекомендация;
          прибыльность не доказана.
        </p>
      </div>
      <CoinAnalysis coin={matched.find((coin) => coin.id === selectedTicker) ?? null} onClose={() => setSelectedTicker(null)} />
    </div>
  );
}
