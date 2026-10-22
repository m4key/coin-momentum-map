import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTradableAssets } from "@/hooks/use-markets";
import { CoinAnalysis } from "@/components/coin-analysis";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/charts")({ head: () => pageHead("Charts", "Свечные графики Binance Spot с EMA 20/50, RSI 14 и историческими объёмами."), component: Charts });
function Charts() {
  const { assets, market, symbols } = useTradableAssets();
  const [q, setQ] = useState(""); const [id, setId] = useState<string | null>(null);
  const selected = assets.find((c) => c.id === id);
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><h1 className="font-mono text-2xl font-semibold">Charts</h1><p className="my-3 text-xs text-muted-foreground">Проверенные соответствия CoinGecko → Binance USDT. Неизвестные соответствия не подставляются по тикеру.</p>
    <input aria-label="Поиск графика" placeholder="Название или тикер" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 h-10 w-full rounded border border-border bg-card px-3" />
    {(market.data?.error || symbols.error) && <p role="alert" className="text-down">{market.data?.error || symbols.error?.message}</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{assets.filter((c) => `${c.name} ${c.ticker}`.toLowerCase().includes(q.toLowerCase())).map((c) => <Button key={c.id} variant="outline" className="h-auto min-h-16 flex-col items-start whitespace-normal" onClick={() => setId(c.id)}><span>{c.name}</span><span className="text-xs text-muted-foreground">{c.binanceTicker}USDT</span></Button>)}</div>
    {assets.length === 0 && <p className="py-10 text-muted-foreground">{market.isPending || symbols.isPending ? "Загрузка…" : "Нет доступных подтверждённых пар"}</p>}
    <CoinAnalysis coin={selected ? { ...selected, ticker: selected.binanceTicker ?? selected.ticker } : null} onClose={() => setId(null)} />
  </div>;
}