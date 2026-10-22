import { useQuery } from "@tanstack/react-query";
import { getMarkets } from "@/lib/markets.functions";
import { useQuery as useBinanceQuery } from "@tanstack/react-query";
import { fetchSymbols } from "@/lib/binance";
export function useMarkets() {
  return useQuery({ queryKey: ["crypto-markets"], queryFn: () => getMarkets(), staleTime: 120_000, refetchInterval: 120_000, refetchOnWindowFocus: false, retry: false });
}
export function useTradableAssets() {
  const market = useMarkets();
  const symbols = useBinanceQuery({ queryKey: ["binance-symbols"], queryFn: fetchSymbols, staleTime: 3_600_000, retry: false });
  const active = new Set(symbols.data?.filter((s) => s.quoteAsset === "USDT" && s.status === "TRADING" && s.isSpotTradingAllowed !== false).map((s) => s.baseAsset));
  return { market, symbols, assets: market.data?.assets.filter((a) => a.binanceTicker && active.has(a.binanceTicker)) ?? [] };
}