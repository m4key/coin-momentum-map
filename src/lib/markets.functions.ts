import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { BINANCE_ASSETS, selectTopAssets, type MarketAsset } from "./market-assets";

const rowSchema = z.object({ id: z.string(), symbol: z.string(), name: z.string(), image: z.string(), current_price: z.number().nonnegative().nullable(), market_cap: z.number().nonnegative().nullable(), market_cap_rank: z.number().nullable(), price_change_percentage_24h: z.number().nullable(), total_volume: z.number().nullable(), last_updated: z.string() });
interface MarketCache { assets: MarketAsset[]; excluded: string[]; classificationComplete: boolean; fetchedAt: number }
let cached: MarketCache | null = null;
let pending: Promise<MarketCache> | null = null;
let pausedUntil = 0;
async function publicJson(path: string) {
  if (Date.now() < pausedUntil) throw new Error("CoinGecko ограничил запросы. Повторите позже.");
  const response = await fetch(`https://api.coingecko.com/api/v3${path}`, { signal: AbortSignal.timeout(20_000) });
  if (response.status === 429) { pausedUntil = Date.now() + 60_000; throw new Error("Превышен лимит CoinGecko. Показаны последние данные, если они были получены."); }
  if (!response.ok) throw new Error(`Источник CoinGecko недоступен (${response.status}).`);
  return response.json();
}
export const getMarkets = createServerFn({ method: "GET" }).handler(async () => {
  try {
    if (!cached || Date.now() - cached.fetchedAt > 120_000) {
      if (!pending) pending = (async () => {
        const rows = z.array(rowSchema).parse(await publicJson("/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false"));
        let excluded = cached?.excluded ?? [];
        let classificationComplete = cached?.classificationComplete ?? false;
        if (!classificationComplete) {
          try {
            const categories = z.array(z.object({ category_id: z.string(), name: z.string() })).parse(await publicJson("/coins/categories/list"));
            const ids = categories.filter((c) => /tokenized (stocks?|etfs?|equities)|tokenized stock/i.test(c.name)).map((c) => c.category_id);
            const collected: string[] = [];
            for (const category of ids) {
              const members = z.array(z.object({ id: z.string() })).parse(await publicJson(`/coins/markets?vs_currency=usd&category=${encodeURIComponent(category)}&per_page=250&page=1`));
              collected.push(...members.map((c) => c.id));
            }
            excluded = collected; classificationComplete = ids.length > 0;
          } catch { classificationComplete = false; }
        }
        const assets = rows.flatMap((r): MarketAsset[] => r.current_price === null || r.market_cap === null || r.total_volume === null || r.price_change_percentage_24h === null ? [] : [{ id: r.id, name: r.name, ticker: r.symbol.toUpperCase(), image: r.image, price: r.current_price, marketCap: r.market_cap, rank: r.market_cap_rank ?? 0, change24h: r.price_change_percentage_24h, volume24h: r.total_volume, sourceUpdatedAt: r.last_updated, binanceTicker: BINANCE_ASSETS[r.id] ?? null, rsi: null, ema20: null, ema50: null, signal: null }]);
        return { assets, excluded, classificationComplete, fetchedAt: Date.now() };
      })().finally(() => { pending = null; });
      cached = await pending;
    }
    if (!cached) throw new Error("Нет данных CoinGecko.");
    return { ...cached, assets: selectTopAssets(cached.assets, cached.excluded), error: "" };
  } catch (e) {
    return { assets: cached ? selectTopAssets(cached.assets, cached.excluded) : [], excluded: cached?.excluded ?? [], classificationComplete: cached?.classificationComplete ?? false, fetchedAt: cached?.fetchedAt ?? 0, error: e instanceof Error ? e.message : "Не удалось получить рыночные данные." };
  }
});