import { useQueries, useQueryClient } from "@tanstack/react-query";
import { BinanceError } from "@/lib/binance";
import { candleOptions } from "@/lib/candle-query";
import { calculateIndicators } from "@/lib/indicators";
import type { Coin } from "@/lib/coins";

export function useIndicators(coins: Coin[]) {
  const queryClient = useQueryClient();
  return useQueries({
    queries: coins.map((coin) => ({
      queryKey: ["binance-indicators", "1h", coin.ticker],
      queryFn: async () => {
        const candles = await queryClient.fetchQuery(candleOptions(coin.ticker, "1h"));
        const indicators = calculateIndicators(candles);
        if (!indicators) throw new BinanceError("Недостаточно корректных закрытых часовых свечей (минимум 50).", "data");
        return indicators;
      },
      staleTime: (query: { state: { data: ReturnType<typeof calculateIndicators> | undefined } }) => {
        const last = query.state.data;
        return last ? Math.max(0, last.candleClosedAt + 3_600_000 + 2000 - Date.now()) : 0;
      },
      gcTime: 2 * 3_600_000,
      refetchInterval: (query: { state: { data: ReturnType<typeof calculateIndicators> | undefined } }) => {
        const last = query.state.data;
        return last ? Math.max(60_000, last.candleClosedAt + 3_600_000 + 2000 - Date.now()) : 300_000;
      },
      refetchOnWindowFocus: false,
      retry: false,
    })),
  });
}