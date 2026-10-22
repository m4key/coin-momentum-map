import { createFileRoute, Link } from "@tanstack/react-router";
import { useMarkets } from "@/hooks/use-markets";
import { pageHead } from "@/lib/page-head";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/dashboard")({ head: () => pageHead("Dashboard", "Обзор топ-200 криптовалют: капитализация, объём и изменение рынка по данным CoinGecko."), component: Dashboard });
function Dashboard() {
  const query = useMarkets();
  const coins = query.data?.assets ?? [];
  const compact = (n: number) => "$" + new Intl.NumberFormat("en", { notation: "compact" }).format(n);
  const cards = [{ label: "Капитализация топ-200", value: coins.length ? compact(coins.reduce((s, c) => s + c.marketCap, 0)) : "—" }, { label: "Объём 24ч", value: coins.length ? compact(coins.reduce((s, c) => s + c.volume24h, 0)) : "—" }, { label: "Растут / падают", value: coins.length ? `${coins.filter((c) => c.change24h >= 0).length} / ${coins.filter((c) => c.change24h < 0).length}` : "—" }];
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><h1 className="font-mono text-2xl font-semibold">Dashboard</h1><p className="mt-2 text-xs text-muted-foreground">CoinGecko · Обновлено: {query.data?.fetchedAt ? new Date(query.data.fetchedAt).toLocaleTimeString("ru") : "Загрузка…"}</p>
    {query.data?.error && <p role="alert" className="mt-3 text-down">{query.data.error}</p>}
    <div className="my-6 grid gap-3 sm:grid-cols-3">{cards.map((c) => <div key={c.label} className="rounded border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{c.label}</p><p className="mt-2 font-mono text-xl">{c.value}</p></div>)}</div>
    <h2 className="mb-3 text-lg font-medium">Лидеры по капитализации</h2><div className="divide-y divide-border">{coins.slice(0, 10).map((c) => <div key={c.id} className="flex items-center justify-between gap-3 py-3"><span>{c.name} <span className="text-xs text-muted-foreground">{c.ticker}</span></span><span className="font-mono">{compact(c.marketCap)}</span><span className={c.change24h >= 0 ? "text-up" : "text-down"}>{c.change24h.toFixed(2)}%</span></div>)}</div><Button asChild variant="outline" className="mt-4"><Link to="/">Все монеты</Link></Button>
  </div>;
}