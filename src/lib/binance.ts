import { COINS, type Coin, type Signal } from "./coins";

// Public Binance Spot market-data hosts (no API key). Second is the official market-data mirror.
const HOSTS = ["https://api.binance.com", "https://data-api.binance.vision"];

export const MAX_COINS = 100;

export interface Ticker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
}

export interface SymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  isSpotTradingAllowed?: boolean;
}

export class BinanceError extends Error {
  constructor(
    message: string,
    public kind: "network" | "rate_limit" | "http" | "data",
  ) {
    super(message);
  }
}

async function getJson(path: string): Promise<unknown> {
  let lastErr = new BinanceError("Нет соединения с Binance", "network");
  for (const host of HOSTS) {
    let res: Response;
    try {
      res = await fetch(`${host}${path}`);
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
    try {
      return await res.json();
    } catch {
      throw new BinanceError("Некорректный ответ Binance.", "data");
    }
  }
  throw lastErr;
}

/** All active spot symbols (one request). */
export async function fetchSymbols(): Promise<SymbolInfo[]> {
  const data = (await getJson("/api/v3/exchangeInfo?permissions=SPOT&symbolStatus=TRADING")) as {
    symbols?: SymbolInfo[];
  };
  if (!Array.isArray(data?.symbols)) throw new BinanceError("Некорректный ответ Binance.", "data");
  return data.symbols;
}

/** 24h tickers for every symbol in one request. */
export async function fetchTickers(): Promise<Ticker[]> {
  const data = await getJson("/api/v3/ticker/24hr");
  if (!Array.isArray(data)) throw new BinanceError("Некорректный ответ Binance.", "data");
  return data as Ticker[];
}

// BTC/ETH have no separate mode, so they are not shown among altcoins.
const MAJORS = new Set(["BTC", "ETH"]);
const STABLES = new Set([
  "USDT", "USDC", "FDUSD", "TUSD", "BUSD", "DAI", "USDP", "PAX", "USDD", "PYUSD", "USDE", "USD1", "RLUSD",
  "AEUR", "EURI", "EUR", "GBP", "TRY", "BRL", "AUD", "JPY", "RUB", "UAH", "ZAR", "BIDR", "IDRT", "BVND", "NGN",
  "XUSD", "BFUSD", "SUSD", "UST", "USTC", "PAXG", "XAUT",
]);
// Wrapped / staked copies of majors.
const WRAPPED = new Set(["WBTC", "WBETH", "BETH", "STETH", "WSTETH", "CBETH", "BNSOL"]);

const CRYPTO_ENDING_B = new Set(["ARB", "BNB", "CKB", "DGB", "TRB", "SHIB", "BB", "YB"]);

export function isEligible(s: SymbolInfo): boolean {
  if (s.quoteAsset !== "USDT" || s.status !== "TRADING" || s.isSpotTradingAllowed === false) return false;
  const b = s.baseAsset.toUpperCase();
  if (MAJORS.has(b) || STABLES.has(b) || WRAPPED.has(b)) return false;
  if (/(UP|DOWN|BULL|BEAR)$/.test(b) && b.length > 4) return false; // leveraged tokens
  // Tokenized stocks/ETFs on Binance use a "B" suffix (AAPLB, NVDAB, SPYB…); keep real crypto with that ending.
  if (b.endsWith("B") && b.length >= 3 && !CRYPTO_ENDING_B.has(b)) return false;
  return true;
}

// Deterministic demo RSI per ticker (RSI is not real yet).
function demoRsi(ticker: string): number {
  let h = 0;
  for (const ch of ticker) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 20 + (h % 61);
}
function demoSignal(rsi: number): Signal {
  return rsi <= 35 ? "BUY" : rsi >= 70 ? "SELL" : "HOLD";
}

/** Eligible altcoins, top `limit` by 24h USDT volume, with live price/change/volume. */
export function buildCoins(symbols: SymbolInfo[], tickers: Ticker[], limit = MAX_COINS): Coin[] {
  const tmap = new Map(tickers.map((t) => [t.symbol, t]));
  const known = new Map(COINS.map((c) => [c.ticker, c]));
  const out: Coin[] = [];
  for (const s of symbols) {
    if (!isEligible(s)) continue;
    const t = tmap.get(s.symbol);
    if (!t) continue;
    const price = Number(t.lastPrice);
    const change24h = Number(t.priceChangePercent);
    const volume24h = Number(t.quoteVolume);
    if (![price, change24h, volume24h].every(Number.isFinite) || price <= 0 || volume24h <= 0) continue;
    const k = known.get(s.baseAsset);
    const rsi = k?.rsi ?? demoRsi(s.baseAsset);
    out.push({
      name: k?.name ?? s.baseAsset,
      ticker: s.baseAsset,
      price,
      change24h,
      volume24h,
      rsi,
      signal: k?.signal ?? demoSignal(rsi),
    });
  }
  return out.sort((a, b) => b.volume24h - a.volume24h).slice(0, limit);
}
