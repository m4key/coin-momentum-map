<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep indicator math in browser-safe pure functions backed by technicalindicators, separate from Binance transport and query hooks, so calculations are independently testable.
- Use serialized, paced per-symbol kline queries with shared React Query candle caching for charts and hourly screener indicators; Binance has no multi-symbol kline endpoint. Market tickers remain bulk requests.
- Render coin analysis in a modal to preserve screener state; dynamically import Lightweight Charts inside an effect and use one synchronized chart with candle, volume and RSI panes.
- ALTS Momentum uses 24-hour close-to-close change from the same closed hourly history, not the continuously changing ticker, to keep confirmed signals consistent.
- AI explanations run only on explicit user action through a server function using the AI Gateway SDK; validate chart snapshots and recompute indicators server-side so prompts use bounded numeric market data, never client-written instructions.
- Market capitalization rankings and aggregate USD quotes come from CoinGecko via a cached public server function; Binance charts require explicit CoinGecko-ID mappings and active exchange symbols to prevent ticker collisions.
- Risk scenarios are pure historical calculations over closed candles, with source labels separating aggregate USD current prices from Binance USDT history; levels are conditional references, not probability estimates.
