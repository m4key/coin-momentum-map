import type { MarketCandle } from "./binance";
export type RiskLevel = "conservative" | "moderate" | "high" | "extreme";
export const riskLabels: Record<RiskLevel, string> = { conservative: "Консервативный", moderate: "Умеренный", high: "Повышенный", extreme: "Экстремальный" };
export const riskLevels: RiskLevel[] = ["conservative", "moderate", "high", "extreme"];
export const riskAppearance: Record<RiskLevel, { text: string; background: string; token: string }> = {
  conservative: { text: "text-risk-conservative", background: "bg-risk-conservative", token: "--risk-conservative" },
  moderate: { text: "text-risk-moderate", background: "bg-risk-moderate", token: "--risk-moderate" },
  high: { text: "text-risk-high", background: "bg-risk-high", token: "--risk-high" },
  extreme: { text: "text-risk-extreme", background: "bg-risk-extreme", token: "--risk-extreme" },
};
export interface Scenario { level: RiskLevel; name: string; price: number; growth: number; multiple: number; kind: "Исторический уровень" | "Расчётный сценарий"; basis: string }
export function riskScenarios(candles: MarketCandle[], current: number, now = Date.now()) {
  const closed = candles.filter((c) => c.closeTime < now).sort((a, b) => a.openTime - b.openTime);
  if (!Number.isFinite(current) || current <= 0 || closed.length < 30) return { scenarios: [] as Scenario[], low: null, high: null, volatility: null, warning: "Недостаточно истории: минимум 30 закрытых свечей." };
  const high = Math.max(...closed.map((c) => c.high)), low = Math.min(...closed.map((c) => c.low));
  const returns = closed.slice(1).map((c, i) => Math.log(c.close / (closed[i]?.close ?? c.close)));
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const volatility = Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1));
  const local = closed.filter((c, i) => i > 0 && i < closed.length - 1 && c.high > (closed[i - 1]?.high ?? Infinity) && c.high >= (closed[i + 1]?.high ?? Infinity) && c.high > current).sort((a, b) => a.high - b.high)[0];
  const scenarios: Scenario[] = [];
  const add = (level: RiskLevel, name: string, price: number, kind: Scenario["kind"], basis: string) => { if (price > current) scenarios.push({ level, name, price, growth: (price / current - 1) * 100, multiple: price / current, kind, basis }); };
  if (local) add("conservative", "Ближайший локальный максимум", local.high, "Исторический уровень", `Максимум свечи выше соседних: ${new Date(local.openTime).toISOString().slice(0, 10)}. Метка риска условная.`);
  if (high > current) add("moderate", "Максимум выбранного периода", high, "Исторический уровень", `Максимальный High среди ${closed.length} закрытых свечей; не максимум за всё время.`);
  add("high", "Волатильность · 2σ", current * Math.exp(2 * volatility * Math.sqrt(30)), "Расчётный сценарий", "P × exp(2 × σ × √30), σ — выборочное стандартное отклонение лог-доходностей свечей. Горизонт: 30 свечей; не вероятность.");
  add("extreme", "Волатильность · 3σ", current * Math.exp(3 * volatility * Math.sqrt(30)), "Расчётный сценарий", "P × exp(3 × σ × √30). Условное расширение волатильности, не прогноз и не подтверждённая вероятность.");
  return { scenarios, low, high, volatility, warning: "Уровни риска условны, не оценки вероятности; прошлые максимумы не гарантируют будущую цену." };
}