import type { Ticker } from "./binance";

/** Only the explicitly mapped Binance USDT symbol can anchor USDT scenarios. */
export function riskQuote(tickers: Ticker[] | undefined, ticker: string) {
  const quote = tickers?.find((row) => row.symbol === `${ticker}USDT`);
  if (!quote) return null;
  const price = Number(quote.lastPrice), volume = Number(quote.quoteVolume);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(volume) || volume < 0) return null;
  return { price, volume };
}