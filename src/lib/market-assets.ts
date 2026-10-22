import type { Coin } from "./coins";

// Identity mappings are explicit CoinGecko IDs, never inferred from ticker similarity.
export const BINANCE_ASSETS: Record<string, string> = {
  bitcoin: "BTC", ethereum: "ETH", solana: "SOL", sui: "SUI", chainlink: "LINK", binancecoin: "BNB", ripple: "XRP", dogecoin: "DOGE", cardano: "ADA", tron: "TRX", avalanche: "AVAX", "avalanche-2": "AVAX", polkadot: "DOT", "bitcoin-cash": "BCH", litecoin: "LTC", uniswap: "UNI", stellar: "XLM", near: "NEAR", aave: "AAVE", "internet-computer": "ICP", "ethereum-classic": "ETC", "fetch-ai": "FET", "render-token": "RENDER", arbitrum: "ARB", optimism: "OP", injective: "INJ", filecoin: "FIL", "hedera-hashgraph": "HBAR", aptos: "APT", "the-open-network": "TON", "the-graph": "GRT", "immutable-x": "IMX", "sei-network": "SEI", "ondo-finance": "ONDO", "ethena": "ENA", "pepe": "PEPE", "bonk": "BONK", "shiba-inu": "SHIB", "worldcoin-wld": "WLD", "bittensor": "TAO", "zcash": "ZEC", "pancakeswap-token": "CAKE", "lido-dao": "LDO", "curve-dao-token": "CRV", "algorand": "ALGO", "cosmos": "ATOM", "vechain": "VET", "theta-token": "THETA", "floki": "FLOKI", "official-trump": "TRUMP", "jupiter-exchange-solana": "JUP", "pyth-network": "PYTH", "pendle": "PENDLE", "arweave": "AR", "quant-network": "QNT", "gala": "GALA", "dash": "DASH", "iota": "IOTA", "tezos": "XTZ", "eos": "EOS", "decentraland": "MANA", "the-sandbox": "SAND", "axie-infinity": "AXS", "eigenlayer": "EIGEN", "starknet": "STRK", "wormhole": "W", "jito-governance-token": "JTO",
};
// Maintainable exclusion IDs, supplemented by source category memberships.
export const EXCLUDED_ASSET_IDS = new Set(["nvidia-xstock", "tesla-xstock", "apple-xstock", "amazon-xstock", "alphabet-xstock", "meta-xstock", "microsoft-xstock", "sp500-xstock", "nasdaq-xstock", "coinbase-xstock"]);
export interface MarketAsset extends Coin { id: string; image: string; marketCap: number; rank: number; sourceUpdatedAt: string; binanceTicker: string | null }
export function selectTopAssets(assets: MarketAsset[], classified: string[] = [], manual: string[] = []) {
  const excluded = new Set([...EXCLUDED_ASSET_IDS, ...classified, ...manual]);
  return assets.filter((a) => !excluded.has(a.id) && a.marketCap > 0).sort((a, b) => b.marketCap - a.marketCap).slice(0, 200);
}