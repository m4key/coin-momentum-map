import { expect, it } from 'vitest';
import { riskScenarios } from '@/lib/risk';
import { selectTopAssets, BINANCE_ASSETS, type MarketAsset } from '@/lib/market-assets';
const candles = Array.from({length: 40}, (_, i) => ({openTime:i*3600000,closeTime:(i+1)*3600000-1,open:100,high:110+i,low:90,close:100+i+(i%2),volume:10}));
it('uses actual period maximum and growth/multiple relative to current price',()=>{
 const result=riskScenarios(candles,100,41*3600000);
 expect(result.high).toBe(149);expect(result.low).toBe(90);
 const historical=result.scenarios.find(s=>s.level==='moderate');
 expect(historical?.price).toBe(149);expect(historical?.growth).toBeCloseTo(49);expect(historical?.multiple).toBe(1.49);
});
it('calculates volatility scenarios using exp(k sigma sqrt(30))',()=>{
 const r=riskScenarios(candles,100,41*3600000);
 expect(r.scenarios.find(s=>s.level==='high')?.price).toBeCloseTo(100*Math.exp(2*(r.volatility??0)*Math.sqrt(30)));
 expect(r.scenarios.find(s=>s.level==='extreme')?.price).toBeCloseTo(100*Math.exp(3*(r.volatility??0)*Math.sqrt(30)));
});
it('does not fabricate levels with fewer than 30 candles',()=>{expect(riskScenarios(candles.slice(0,29),100).scenarios).toEqual([]);});
it('keeps history fixed and recalculates scenarios when the Binance current price changes',()=>{
 const first=riskScenarios(candles,100,41*3600000);
 const second=riskScenarios(candles,120,41*3600000);
 expect(second.high).toBe(149);
 expect(second.scenarios.find(s=>s.level==='moderate')?.growth).toBeCloseTo((149/120-1)*100);
 expect(second.scenarios.find(s=>s.level==='high')?.price).toBeCloseTo((first.scenarios.find(s=>s.level==='high')?.price??0)*1.2);
 expect(second.scenarios.find(s=>s.level==='moderate')?.kind).toBe('Исторический уровень');
 expect(second.scenarios.find(s=>s.level==='high')?.kind).toBe('Расчётный сценарий');
});
it('recomputes the historical maximum for the selected period without inventing missing maxima',()=>{
 expect(riskScenarios(candles.slice(0,30),100,41*3600000).high).toBe(139);
 const result=riskScenarios(candles,160,41*3600000);
 expect(result.scenarios.some(s=>s.level==='moderate'||s.level==='conservative')).toBe(false);
});
it('top200 keeps ordinary RWA and excludes asset IDs not ticker names',()=>{
 const assets=Array.from({length:205},(_,i)=>({id:'coin'+i,ticker:'B',marketCap:i+1} as MarketAsset));
 assets.push({id:'ondo-finance',marketCap:1000,ticker:'ONDO'} as MarketAsset,{id:'nvidia-xstock',marketCap:2000,ticker:'NVDA'} as MarketAsset);
 const out=selectTopAssets(assets,[],['coin204']);
 expect(out).toHaveLength(200);expect(out[0]?.id).toBe('ondo-finance');expect(out.some(c=>c.id==='nvidia-xstock'||c.id==='coin204')).toBe(false);
 expect(BINANCE_ASSETS['solana']).toBe('SOL');expect(BINANCE_ASSETS['fake-sol']).toBeUndefined();
});
