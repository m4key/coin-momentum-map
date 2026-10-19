export type Signal = "BUY" | "SELL" | "HOLD";

export interface Coin {
  name: string;
  ticker: string;
  price: number;
  change24h: number;
  volume24h: number;
  rsi: number;
  signal: Signal;
}

export const COINS: Coin[] = [
  { name: "Bitcoin", ticker: "BTC", price: 67842.15, change24h: 2.34, volume24h: 28_450_000_000, rsi: 58, signal: "HOLD" },
  { name: "Ethereum", ticker: "ETH", price: 3245.8, change24h: -1.12, volume24h: 14_320_000_000, rsi: 44, signal: "HOLD" },
  { name: "Solana", ticker: "SOL", price: 168.42, change24h: 6.87, volume24h: 3_870_000_000, rsi: 74, signal: "SELL" },
  { name: "Sui", ticker: "SUI", price: 1.86, change24h: -4.95, volume24h: 612_000_000, rsi: 27, signal: "BUY" },
  { name: "Chainlink", ticker: "LINK", price: 14.73, change24h: 0.58, volume24h: 498_000_000, rsi: 36, signal: "BUY" },
];

export type SortKey = "name" | "price" | "change24h" | "volume24h" | "rsi" | "signal";
export type ChangeFilter = "all" | "up" | "down";

export function filterCoins(coins: Coin[], q: string, change: ChangeFilter, signal: Signal | "all") {
  const s = q.trim().toLowerCase();
  return coins.filter(
    (c) =>
      (!s || c.name.toLowerCase().includes(s) || c.ticker.toLowerCase().includes(s)) &&
      (change === "all" || (change === "up" ? c.change24h >= 0 : c.change24h < 0)) &&
      (signal === "all" || c.signal === signal),
  );
}

export function sortCoins(coins: Coin[], key: SortKey, dir: "asc" | "desc") {
  const m = dir === "asc" ? 1 : -1;
  return [...coins].sort((a, b) => {
    const va = key === "name" ? a.name : a[key];
    const vb = key === "name" ? b.name : b[key];
    if (typeof va === "string") return va.localeCompare(vb as string) * m;
    return ((va as number) - (vb as number)) * m;
  });
}
