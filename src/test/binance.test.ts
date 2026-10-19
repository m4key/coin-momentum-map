import { describe, expect, it } from "vitest";
import { mergeTickers } from "@/lib/binance";
import { COINS } from "@/lib/coins";

describe("mergeTickers", () => {
  it("uses lastPrice, priceChangePercent and quoteVolume", () => {
    const out = mergeTickers(COINS, [
      { symbol: "BTCUSDT", lastPrice: "100.5", priceChangePercent: "-3.2", quoteVolume: "12345" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ ticker: "BTC", price: 100.5, change24h: -3.2, volume24h: 12345 });
  });
});
