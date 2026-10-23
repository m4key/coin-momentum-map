import { expect, it } from "vitest";
import { riskQuote } from "@/lib/risk-quote";

it("uses only the selected Binance USDT quote, not another pair or aggregate USD", () => {
  const tickers = [
    { symbol: "SOLUSDC", lastPrice: "160", quoteVolume: "10", priceChangePercent: "1" },
    { symbol: "SOLUSDT", lastPrice: "155.25", quoteVolume: "1000000", priceChangePercent: "2" },
    { symbol: "BTCUSDT", lastPrice: "100000", quoteVolume: "2000000", priceChangePercent: "3" },
  ];
  expect(riskQuote(tickers, "SOL")).toEqual({ price: 155.25, volume: 1000000 });
  expect(riskQuote(tickers, "LINK")).toBeNull();
});

it("does not invent a current price from missing or invalid Binance data", () => {
  expect(riskQuote(undefined, "SOL")).toBeNull();
  expect(riskQuote([{ symbol: "SOLUSDT", lastPrice: "NaN", quoteVolume: "10", priceChangePercent: "0" }], "SOL")).toBeNull();
});