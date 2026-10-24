import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTradableAssets } from "@/hooks/use-markets";
import { RiskPanel } from "@/components/risk-panel";
import { pageHead } from "@/lib/page-head";
import type { Timeframe } from "@/lib/binance";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/risk")({ head: () => pageHead("Risk Screener", "Исторические максимумы, диапазоны и прозрачные сценарии волатильности для криптовалют — без обещаний доходности."), component: Risk });
function Risk() {
  const { assets, market, symbols } = useTradableAssets();
  const [q, setQ] = useState(""); const [id, setId] = useState("bitcoin"); const [compare, setCompare] = useState("");
  const [mode, setMode] = useState<"candles" | "area">("area");
  const [frame, setFrame] = useState<Timeframe>("1d"); const [days, setDays] = useState(365); const [level, setLevel] = useState("all"); const [cap, setCap] = useState("all"); const [change, setChange] = useState("all"); const [ascending, setAscending] = useState(false);
  const filtered = assets.filter((a) => `${a.name} ${a.ticker}`.toLowerCase().includes(q.toLowerCase()) && (cap === "all" || (cap === "large" ? a.marketCap >= 1e10 : a.marketCap < 1e10)) && (change === "all" || (change === "up" ? a.change24h >= 0 : a.change24h < 0)));
  const selected = filtered.find((a) => a.id === id) ?? filtered[0]; const compared = filtered.find((a) => a.id === compare && a.id !== selected?.id);
  const cls = "h-8 min-w-0 rounded border border-border bg-card px-2 text-xs";
  return <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6">
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-start">
      <h1 className="font-mono text-2xl font-semibold">Risk</h1>
      <div className="flex shrink-0 gap-0.5 rounded border border-border p-0.5" aria-label="Версия Risk">
        <Button size="sm" className="h-7 px-3 text-xs" aria-pressed>Risk</Button>
        <Button size="sm" variant="ghost" className="h-7 px-3 text-xs" disabled title="Методика v2 пока не определена">v2</Button>
        <Button size="sm" variant="ghost" className="h-7 px-3 text-xs" disabled title="Методика v3 пока не определена">v3</Button>
      </div>
    </header>
    <p className="mt-2 max-w-4xl text-xs leading-5 text-muted-foreground">Исторические максимумы и условные сценарии волатильности относительно текущей цены. Уровни не означают вероятность достижения цены.</p>
    {(market.data?.error || symbols.error) && <div role="alert" className="mt-3 flex items-center gap-2 text-xs text-down">{market.data?.error || symbols.error?.message}<Button variant="outline" size="sm" onClick={() => { void market.refetch(); void symbols.refetch(); }}>Повторить</Button></div>}
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-[minmax(160px,230px)_130px_180px_120px_auto]">
      <select aria-label="Монета" className={cls} value={selected?.id ?? ""} onChange={(e) => setId(e.target.value)}>{filtered.map((a) => <option key={a.id} value={a.id}>{a.ticker} · {a.name}</option>)}</select>
      <select aria-label="Торговая пара" className={cls} value={selected?.binanceTicker ?? ""} onChange={() => {}}>{selected && <option value={selected.binanceTicker ?? ""}>/ USDT · Binance</option>}</select>
      <select aria-label="Уровень риска" className={cls} value={level} onChange={(e) => setLevel(e.target.value)}><option value="all">Все уровни риска</option><option value="conservative">Консервативный</option><option value="moderate">Умеренный</option><option value="high">Повышенный</option><option value="extreme">Экстремальный</option></select>
      <select aria-label="Таймфрейм" className={cls} value={frame} onChange={(e) => setFrame(e.target.value as Timeframe)}><option value="15m">15 минут</option><option value="1h">1 час</option><option value="4h">4 часа</option><option value="1d">1 день</option></select>
      <div className="col-span-2 flex gap-1 sm:col-span-4 xl:col-span-1">{[30, 90, 365].map((d) => <Button key={d} size="sm" className="h-8 px-2 text-xs" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>{d} дней</Button>)}</div>
    </div>
    <details className="mt-2 text-xs text-muted-foreground"><summary className="w-fit cursor-pointer py-1">Дополнительные параметры</summary>
      <div className="mt-2 grid gap-2 sm:grid-cols-3 xl:grid-cols-5"><input aria-label="Поиск монеты" className={cls} placeholder="Название или тикер" value={q} onChange={(e) => setQ(e.target.value)} /><select aria-label="Капитализация" className={cls} value={cap} onChange={(e) => setCap(e.target.value)}><option value="all">Любая капитализация</option><option value="large">≥ $10B</option><option value="small">&lt; $10B</option></select><select aria-label="Изменение 24ч" className={cls} value={change} onChange={(e) => setChange(e.target.value)}><option value="all">Любое изменение</option><option value="up">Рост</option><option value="down">Падение</option></select><select aria-label="Сортировка сценариев" className={cls} value={ascending ? "asc" : "desc"} onChange={(e) => setAscending(e.target.value === "asc")}><option value="desc">Изменение: по убыванию</option><option value="asc">Изменение: по возрастанию</option></select><select aria-label="Сравнить монету" className={cls} value={compare} onChange={(e) => setCompare(e.target.value)}><option value="">Без сравнения</option>{filtered.filter((a) => a.id !== selected?.id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
    </details>
    <div className="mt-3 flex gap-1" aria-label="Вид графика"><Button size="sm" className="h-7 px-3 text-xs" variant={mode === "candles" ? "default" : "outline"} aria-pressed={mode === "candles"} onClick={() => setMode("candles")}>Свечи</Button><Button size="sm" className="h-7 px-3 text-xs" variant={mode === "area" ? "default" : "outline"} aria-pressed={mode === "area"} onClick={() => setMode("area")}>Область</Button></div>
    {selected ? <RiskPanel key={`${selected.id}:${frame}`} asset={selected} timeframe={frame} days={days} level={level} ascending={ascending} mode={mode} /> : <p className="py-10 text-muted-foreground">{market.isPending || symbols.isPending ? "Загрузка…" : "Нет монет по выбранным фильтрам или подтверждённых пар Binance"}</p>}
    {compared && <RiskPanel key={`${compared.id}:${frame}`} asset={compared} timeframe={frame} days={days} level={level} ascending={ascending} mode={mode} />}
  </div>;
}
