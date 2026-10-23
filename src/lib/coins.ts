import type { Indicators, Momentum } from "./indicators";
export type Signal = Momentum;

export interface Coin {
  name: string;
  ticker: string;
  price: number;
  marketCap?: number;
  change24h: number;
  volume24h: number;
  rsi: number | null;
  signal: Signal | null;
  ema20: number | null;
  ema50: number | null;
  indicators?: Indicators | null;
  indicatorError?: string;
}

export const COIN_NAMES: Record<string, string> = {
  BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", SUI: "Sui", LINK: "Chainlink",
};

export type SortKey = "marketCap" | "name" | "price" | "change24h" | "volume24h" | "rsi" | "ema20" | "ema50" | "signal";
export type ChangeFilter = "all" | "up" | "down";

export function filterCoins<T extends Coin>(coins: T[], q: string, change: ChangeFilter, signal: Signal | "all" | "missing") {
  const s = q.trim().toLowerCase();
  return coins.filter(
    (c) =>
      (!s || c.name.toLowerCase().includes(s) || c.ticker.toLowerCase().includes(s)) &&
      (change === "all" || (change === "up" ? c.change24h >= 0 : c.change24h < 0)) &&
      (signal === "all" || (signal === "missing" ? c.signal === null : c.signal === signal)),
  );
}

export function sortCoins<T extends Coin>(coins: T[], key: SortKey, dir: "asc" | "desc") {
  const m = dir === "asc" ? 1 : -1;
  return [...coins].sort((a, b) => {
    const va = key === "name" ? a.name : a[key];
    const vb = key === "name" ? b.name : b[key];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "string") return va.localeCompare(vb as string) * m;
    return ((va as number) - (vb as number)) * m;
  });
}
