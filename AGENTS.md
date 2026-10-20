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
- Use serialized, paced per-symbol hourly kline queries with React Query caching; Binance has no multi-symbol kline endpoint. Market tickers remain bulk requests.
- ALTS Momentum uses 24-hour close-to-close change from the same closed hourly history, not the continuously changing ticker, to keep confirmed signals consistent.
