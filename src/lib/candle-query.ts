import { queryOptions } from "@tanstack/react-query";
import { fetchCandles, TIMEFRAME_MS, type Timeframe } from "./binance";

export function candleOptions(ticker: string, timeframe: Timeframe) {
  return queryOptions({
    queryKey: ["binance-candles", ticker, timeframe],
    queryFn: () => fetchCandles(ticker, timeframe),
    staleTime: (query) => {
      const last = query.state.data?.at(-1);
      return last ? Math.max(0, last.closeTime + 1 + TIMEFRAME_MS[timeframe] + 2000 - query.state.dataUpdatedAt) : 0;
    },
    gcTime: 2 * 3_600_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}