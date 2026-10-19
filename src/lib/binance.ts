import type { Coin } from "./coins";

export const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "SUIUSDT", "LINKUSDT"] as const;

// Public Binance Spot market-data hosts (no API key). Second is the official market-data mirror.
const HOSTS = ["https://api.binance.com", "https://data-api.binance.vision"];

export interface Ticker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
}

export class BinanceError extends Error {
  constructor(
    message: string,
    public kind: "network" | "rate_limit" | "http" | "data",
  ) {
    super(message);
  }
}

export async function fetchTickers(): Promise<Ticker[]> {
  const qs = encodeURIComponent(JSON.stringify(SYMBOLS));
  let lastErr: BinanceError = new BinanceError("Нет соединения с Binance", "network");
  for (const host of HOSTS) {
    let res: Response;
    try {
      res = await fetch(`${host}/api/v3/ticker/24hr?symbols=${qs}`);
    } catch {
      lastErr = new BinanceError("Не удалось подключиться к Binance. Проверьте интернет-соединение.", "network");
      continue;
    }
    if (res.status === 429 || res.status === 418) {
      // Rate limited: do not hammer the other host, surface immediately.
      throw new BinanceError("Превышен лимит запросов к Binance. Попробуйте чуть позже.", "rate_limit");
    }
    if (!res.ok) {
      lastErr = new BinanceError(`Binance вернул ошибку (код ${res.status}).`, "http");
      continue;
    }
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) throw new BinanceError("Некорректный ответ Binance.", "data");
    return data as Ticker[];
  }
  throw lastErr;
}

/** Overwrite price / 24h change / quote volume with live values; drop coins missing from the response. */
export function mergeTickers(coins: Coin[], tickers: Ticker[]): Coin[] {
  const map = new Map(tickers.map((t) => [t.symbol, t]));
  return coins.flatMap((c) => {
    const t = map.get(`${c.ticker}USDT`);
    if (!t) return [];
    const price = Number(t.lastPrice);
    const change24h = Number(t.priceChangePercent);
    const volume24h = Number(t.quoteVolume);
    if (![price, change24h, volume24h].every(Number.isFinite)) return [];
    return [{ ...c, price, change24h, volume24h }];
  });
}
