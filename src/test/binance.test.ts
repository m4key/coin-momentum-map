import { describe, expect, it } from "vitest";
import { buildCoins, type SymbolInfo, type Ticker } from "@/lib/binance";

const sym = (base: string, quote = "USDT", status = "TRADING"): SymbolInfo => ({
  symbol: base + quote,
  baseAsset: base,
  quoteAsset: quote,
  status,
});
const tk = (symbol: string, vol: number): Ticker => ({
  symbol,
  lastPrice: "1.5",
  priceChangePercent: "-3.2",
  quoteVolume: String(vol),
});

describe("buildCoins", () => {
  it("uses lastPrice, priceChangePercent and quoteVolume", () => {
    const [c] = buildCoins([sym("SOL")], [tk("SOLUSDT", 1000)]);
    expect(c).toMatchObject({ ticker: "SOL", price: 1.5, change24h: -3.2, volume24h: 1000 });
  });

  it("excludes BTC, ETH, stablecoins, leveraged tokens, non-USDT and inactive pairs", () => {
    const symbols = [sym("BTC"), sym("ETH"), sym("USDC"), sym("FDUSD"), sym("BNBUP"), sym("NVDAB"), sym("ARB"), sym("LINK", "BTC"), sym("XRP", "USDT", "BREAK"), sym("ADA")];
    const tickers = symbols.map((s) => tk(s.symbol, 100));
    expect(buildCoins(symbols, tickers).map((c) => c.ticker)).toEqual(["ARB", "ADA"]);
  });

  it("keeps at most 100 coins with the highest volume", () => {
    const symbols = Array.from({ length: 150 }, (_, i) => sym(`C${i}`));
    const tickers = symbols.map((s, i) => tk(s.symbol, i + 1));
    const out = buildCoins(symbols, tickers);
    expect(out).toHaveLength(100);
    expect(out[0]?.ticker).toBe("C149");
    expect(out[99]?.ticker).toBe("C50");
  });
  it("never assigns demo indicators to market quotes", () => {
    expect(buildCoins([sym("SOL")], [tk("SOLUSDT", 1000)])[0]).toMatchObject({ rsi: null, signal: null, ema20: null, ema50: null });
  });
});
