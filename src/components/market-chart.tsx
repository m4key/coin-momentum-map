import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import type { chartData } from "@/lib/chart-data";

type Data = ReturnType<typeof chartData>;
const number = (n: number) => n.toLocaleString("en-US", { maximumSignificantDigits: 7 });

export function MarketChart({ data, mode = "candles", levels = [], currentPrice, currentPriceLabel = "Текущая · CG", overview = false }: { data: Data; mode?: "candles" | "area"; levels?: { price: number; title: string; token: string }[]; currentPrice?: number; currentPriceLabel?: string; overview?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const api = useRef<{ chart: IChartApi; candle: ISeriesApi<"Candlestick">; volume: ISeriesApi<"Histogram">; ema20: ISeriesApi<"Line">; ema50: ISeriesApi<"Line">; rsi: ISeriesApi<"Line">; up: string; down: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState("");
  const previous = useRef<Data | null>(null);
  const latest = useRef(data);
  latest.current = data;
  const overlay = useRef<ISeriesApi<"Area"> | null>(null);
  const levelSeries = useRef<ISeriesApi<"Line"> | null>(null);
  const resolveColor = useRef<(token: string) => string>(() => "");

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    void import("lightweight-charts").then((lc) => {
      const el = container.current;
      if (disposed || !el) return;
      const styles = getComputedStyle(el);
      // Canvas requires concrete colors: resolve the same semantic tokens used by the UI.
      const color = (token: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1; canvas.height = 1;
        const context = canvas.getContext("2d");
        if (!context) return styles.getPropertyValue(token).trim();
        context.fillStyle = styles.getPropertyValue(token).trim();
        context.fillRect(0, 0, 1, 1);
        const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
        return `rgba(${r},${g},${b},${(alpha ?? 255) / 255})`;
      };
      const up = color("--up"), down = color("--down"), muted = color("--muted-foreground"), border = color("--border");
      resolveColor.current = color;
      const chart = lc.createChart(el, {
        autoSize: true,
        layout: { background: { type: lc.ColorType.Solid, color: color("--background") }, textColor: muted, fontFamily: styles.fontFamily, attributionLogo: true },
        grid: { vertLines: { color: border }, horzLines: { color: border } },
        rightPriceScale: { borderColor: border, minimumWidth: 72 },
        timeScale: { borderColor: border, timeVisible: true, secondsVisible: false },
        localization: { locale: "ru-RU", priceFormatter: number },
        crosshair: { mode: lc.CrosshairMode.Normal },
      });
      const candle = chart.addSeries(lc.CandlestickSeries, { upColor: up, downColor: down, wickUpColor: up, wickDownColor: down, borderVisible: false }, 0);
      if (mode === "area") {
        candle.applyOptions({ visible: false });
        overlay.current = chart.addSeries(lc.AreaSeries, { lineColor: up, topColor: color("--muted"), bottomColor: color("--background"), lineWidth: 2 }, 0);
      }
      levelSeries.current = chart.addSeries(lc.LineSeries, { color: muted, lineVisible: false, lastValueVisible: false, priceLineVisible: false }, 0);
      const ema20 = chart.addSeries(lc.LineSeries, { color: color("--primary"), lineWidth: 2, priceLineVisible: false, lastValueVisible: false }, 0);
      const ema50 = chart.addSeries(lc.LineSeries, { color: color("--chart-ema50"), lineWidth: 2, priceLineVisible: false, lastValueVisible: false }, 0);
      const volume = chart.addSeries(lc.HistogramSeries, { priceFormat: { type: "volume" }, priceLineVisible: false }, 1);
      const rsi = chart.addSeries(lc.LineSeries, { color: color("--chart-rsi"), lineWidth: 2, priceFormat: { type: "price", precision: 2, minMove: 0.01 }, priceLineVisible: false, autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) }, 2);
      for (const level of [30, 50, 70]) rsi.createPriceLine({ price: level, color: muted, lineWidth: 1, lineStyle: lc.LineStyle.Dashed, axisLabelVisible: true, title: "" });
      chart.panes()[0]?.setStretchFactor(overview ? 9 : 5);
      chart.panes()[1]?.setStretchFactor(1.3);
      chart.panes()[2]?.setStretchFactor(2);
      chart.subscribeCrosshairMove((param) => {
        const bar = mode === "area" ? latest.current.candles.find((c) => c.openTime / 1000 === param.time) : param.seriesData.get(candle);
        const vol = param.seriesData.get(volume);
        const r = param.seriesData.get(rsi);
        const e20 = param.seriesData.get(ema20), e50 = param.seriesData.get(ema50);
        if (!bar || !("open" in bar) || typeof param.time !== "number") { setHover(""); return; }
        setHover(`${new Date(param.time * 1000).toLocaleString("ru-RU", { timeZone: "UTC" })} UTC · O ${number(bar.open)} · H ${number(bar.high)} · L ${number(bar.low)} · C ${number(bar.close)} · V ${vol && "value" in vol ? number(vol.value) : "—"} · EMA 20 ${e20 && "value" in e20 ? number(e20.value) : "—"} · EMA 50 ${e50 && "value" in e50 ? number(e50.value) : "—"} · RSI ${r && "value" in r ? r.value.toFixed(2) : "—"}`);
      });
      api.current = { chart, candle, volume, ema20, ema50, rsi, up, down };
      setReady(true);
      cleanup = () => { api.current = null; overlay.current = null; levelSeries.current = null; chart.remove(); };
    });
    return () => { disposed = true; cleanup(); };
  }, []);

  useEffect(() => {
    const a = api.current;
    if (!ready || !a) return;
    const range = a.chart.timeScale().getVisibleRange();
    const time = (ms: number) => ms / 1000 as UTCTimestamp;
    a.candle.setData(data.candles.map((c) => ({ time: time(c.openTime), open: c.open, high: c.high, low: c.low, close: c.close })));
    overlay.current?.setData(data.candles.map((c) => ({ time: time(c.openTime), value: c.close })));
    const scaleSeries = levelSeries.current;
    if (scaleSeries && data.candles.length) {
      const first = data.candles[0], last = data.candles.at(-1);
      if (first && last && first !== last) {
        const max = Math.max(...levels.map((l) => l.price), currentPrice ?? last.close, last.close);
        const min = Math.min(first.low, last.low, currentPrice ?? last.close);
        scaleSeries.setData([{ time: time(first.openTime), value: min }, { time: time(last.openTime), value: max }]);
      }
    }
    a.volume.setData(data.candles.map((c) => ({ time: time(c.openTime), value: c.volume, color: c.close >= c.open ? a.up : a.down })));
    a.ema20.setData(data.ema20.map((p) => ({ ...p, time: p.time as UTCTimestamp })));
    a.ema50.setData(data.ema50.map((p) => ({ ...p, time: p.time as UTCTimestamp })));
    a.rsi.setData(data.rsi.map((p) => ({ ...p, time: p.time as UTCTimestamp })));
    if (previous.current && range) a.chart.timeScale().setVisibleRange(range);
    else a.chart.timeScale().setVisibleLogicalRange({ from: overview ? 0 : Math.max(0, data.candles.length - 120), to: data.candles.length + 3 });
    previous.current = data;
  }, [data, ready, levels, currentPrice, overview]);

  useEffect(() => {
    const series = levelSeries.current;
    if (!ready || !series) return;
    const lines = [...levels, ...(currentPrice ? [{ price: currentPrice, title: currentPriceLabel, token: "--foreground" }] : [])].map((l) => series.createPriceLine({ price: l.price, title: l.title, color: resolveColor.current(l.token), lineWidth: 1, lineStyle: 2, axisLabelVisible: true }));
    return () => { if (levelSeries.current === series) lines.forEach((line) => series.removePriceLine(line)); };
  }, [levels, currentPrice, currentPriceLabel, ready]);

  return <div className="min-w-0">
    <div className="min-h-10 break-words py-2 font-mono text-xs leading-5 text-muted-foreground" aria-live="polite" data-testid="candle-values">{hover || "OHLC · EMA 20 · EMA 50 · Объём · RSI 14"}</div>
    <div ref={container} className={overview ? "h-[520px] w-full sm:h-[700px]" : "h-[560px] w-full sm:h-[650px]"} aria-label="Свечной график, объём и RSI 14" />
  </div>;
}