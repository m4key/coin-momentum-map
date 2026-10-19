import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { filterCoins, sortCoins, type ChangeFilter, type Signal, type SortKey } from "@/lib/coins";
import { BinanceError, buildCoins, fetchSymbols, fetchTickers } from "@/lib/binance";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Crypto Metrics — скринер альткоинов" },
      { name: "description", content: "Скринер криптовалют: цена, изменение, объём, RSI и торговые сигналы." },
      { property: "og:title", content: "Crypto Metrics — скринер альткоинов" },
      { property: "og:description", content: "Анализ альткоинов и поиск торговых возможностей." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const usd = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: n < 10 ? 4 : 2 });
const compact = (n: number) =>
  "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

const COLUMNS: { key: SortKey; label: string; align?: string }[] = [
  { key: "name", label: "Монета" },
  { key: "price", label: "Цена", align: "text-right" },
  { key: "change24h", label: "24ч", align: "text-right" },
  { key: "volume24h", label: "Объём 24ч", align: "text-right" },
  { key: "rsi", label: "RSI (демо)", align: "text-right" },
  { key: "signal", label: "Сигнал (демо)", align: "text-right" },
];

const signalLabel: Record<Signal, string> = { BUY: "Покупка", SELL: "Продажа", HOLD: "Держать" };
const signalClass: Record<Signal, string> = {
  BUY: "bg-up/15 text-up border-up/30",
  SELL: "bg-down/15 text-down border-down/30",
  HOLD: "bg-muted text-muted-foreground border-border",
};

function rsiClass(r: number) {
  return r >= 70 ? "text-down" : r <= 30 ? "text-up" : "text-foreground";
}

function Index() {
  const [q, setQ] = useState("");
  const [change, setChange] = useState<ChangeFilter>("all");
  const [signal, setSignal] = useState<Signal | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("volume24h");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

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

  const live = useMemo(
    () => (symbolsQuery.data && tickersQuery.data ? buildCoins(symbolsQuery.data, tickersQuery.data) : []),
    [symbolsQuery.data, tickersQuery.data],
  );

  const rows = useMemo(
    () => sortCoins(filterCoins(live, q, change, signal), sortKey, dir),
    [live, q, change, signal, sortKey, dir],
  );

  const n = live.length || 1;
  const totalVol = live.reduce((s, c) => s + c.volume24h, 0);
  const avgChange = live.reduce((s, c) => s + c.change24h, 0) / n;
  const gainers = live.filter((c) => c.change24h >= 0).length;
  const avgRsi = live.reduce((s, c) => s + c.rsi, 0) / n;
  const hasData = live.length > 0;
  const updatedAt = query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toLocaleTimeString("ru-RU") : null;

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setDir(k === "name" ? "asc" : "desc");
    }
  };

  const dash = "—";
  const summary = [
    { label: "Объём 24ч", value: hasData ? compact(totalVol) : dash },
    {
      label: "Среднее изменение",
      value: hasData ? pct(avgChange) : dash,
      cls: hasData ? (avgChange >= 0 ? "text-up" : "text-down") : "",
    },
    { label: "Растут / падают", value: hasData ? `${gainers} / ${live.length - gainers}` : dash },
    { label: "Средний RSI (демо)", value: hasData ? avgRsi.toFixed(1) : dash },
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
              <span>Данные Binance Spot</span>
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

        {query.isError && (
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-down/40 bg-down/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium text-down">Не удалось обновить данные Binance</div>
              <div className="text-muted-foreground">
                {query.error instanceof Error ? query.error.message : "Неизвестная ошибка."}
                {hasData && updatedAt ? ` Показаны последние полученные данные от ${updatedAt}.` : ""}
              </div>
            </div>
            <button
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className="h-9 rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {query.isFetching ? "Загрузка…" : "Повторить"}
            </button>
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по названию или тикеру"
            className={`${selectCls} flex-1 placeholder:text-muted-foreground`}
          />
          <select value={change} onChange={(e) => setChange(e.target.value as ChangeFilter)} className={selectCls}>
            <option value="all">Любое изменение</option>
            <option value="up">Только рост</option>
            <option value="down">Только падение</option>
          </select>
          <select value={signal} onChange={(e) => setSignal(e.target.value as Signal | "all")} className={selectCls}>
            <option value="all">Все сигналы</option>
            <option value="BUY">Покупка</option>
            <option value="SELL">Продажа</option>
            <option value="HOLD">Держать</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border">
                {COLUMNS.map((c) => (
                  <th key={c.key} className={`px-4 py-3 font-medium ${c.align ?? "text-left"}`}>
                    <button
                      onClick={() => toggleSort(c.key)}
                      className={`inline-flex items-center gap-1 text-xs uppercase tracking-wider transition-colors hover:text-foreground ${
                        sortKey === c.key ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {c.label}
                      <span className="w-3">{sortKey === c.key ? (dir === "asc" ? "▲" : "▼") : ""}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.ticker} className="border-b border-border last:border-0 transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{c.ticker}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{usd(c.price)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${c.change24h >= 0 ? "text-up" : "text-down"}`}>
                    {pct(c.change24h)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{compact(c.volume24h)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${rsiClass(c.rsi)}`}>{c.rsi}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${signalClass[c.signal]}`}>
                      {signalLabel[c.signal]}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    {query.isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Загрузка данных Binance…
                      </span>
                    ) : !hasData ? (
                      "Нет данных: Binance недоступен."
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
          Цена, изменение и объём — данные Binance Spot (пары к USDT), обновление каждые 30 секунд. RSI и сигналы —
          демонстрационные значения, не являются торговыми рекомендациями.
        </p>
      </div>
    </div>
  );
}
