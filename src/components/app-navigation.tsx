import { Link } from "@tanstack/react-router";
import { Table2, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
const items = [{ to: "/", label: "Crypto Screener", icon: Table2 }, { to: "/risk", label: "Risk Screener", icon: ShieldCheck }] as const;
export function AppNavigation({ children }: { children: ReactNode }) {
  return <div className="min-h-screen lg:flex">
    <aside className="border-b border-border bg-card lg:fixed lg:inset-y-0 lg:w-52 lg:border-b-0 lg:border-r">
      <div className="px-4 py-5 font-mono font-semibold"><span className="mr-2 inline-block size-3 rounded-sm bg-primary" />Crypto Metrics</div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col" aria-label="Основное меню">
        {items.map((item) => <Link key={item.to} to={item.to} activeOptions={{ exact: true }} activeProps={{ className: "bg-primary/15 text-primary" }} inactiveProps={{ className: "text-muted-foreground hover:bg-muted" }} className="flex shrink-0 items-center gap-2 rounded px-3 py-3 text-sm"><item.icon className="size-4" />{item.label}</Link>)}
      </nav>
      <p className="hidden px-4 text-xs text-muted-foreground lg:block">CoinGecko · Binance Spot</p>
    </aside>
    <main className="min-w-0 flex-1 lg:ml-52">{children}</main>
  </div>;
}