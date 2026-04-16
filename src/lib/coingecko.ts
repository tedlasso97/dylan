// CoinGecko API utilities and types

export type Fiat = 'CAD' | 'USD';
export type TimeRange = '1' | '7' | '30';

export interface PortfolioAsset {
  id: string;        // coingecko id, e.g., 'solana'
  symbol: string;    // 'sol'
  name: string;      // 'Solana'
  quantity: number;  // user-entered
  priceUsd?: number; // user-entered manual price
}

export interface LiveAssetData {
  id: string;
  price: number;
  change24hPct?: number;
  marketCap?: number;
}

export interface HistoricalPoint {
  t: number;  // timestamp ms
  v: number;  // value
}

export interface PortfolioSnapshot {
  totalValue: number;
  byAsset: Array<{
    id: string;
    name: string;
    symbol: string;
    quantity: number;
    price: number;
    value: number;
    weightPct: number;
    change24hPct?: number;
  }>;
}

// API Response Types
export interface CoinGeckoPriceResponse {
  [coinId: string]: {
    [fiat: string]: number;
  } & {
    [key: string]: any;
  };
}

export interface CoinGeckoMarketChartResponse {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
}









