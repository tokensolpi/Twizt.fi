export enum OrderType {
  BUY = 'BUY',
  SELL = 'SELL',
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export interface Trade {
  price: number;
  amount: number;
  time: string;
  type: OrderType;
}

export interface MarketDataState {
  price: number;
  price_24h_change: number;
  price_24h_change_percent: number;
  high_24h: number;
  low_24h: number;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  trades: Trade[];
}

export enum OrderStatus {
  OPEN = 'OPEN',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  LIQUIDATED = 'LIQUIDATED',
}

export interface Order {
  id: string;
  type: OrderType;
  price: number;
  amount: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  filledAt?: string;
}

export interface Balances {
  usdt: number;
  btc: number;
  usdt_sol: number;
  gdp: number; // Gemini DEX LP Token
}

export enum PositionSide {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export interface FuturesPosition {
  id: string;
  side: PositionSide;
  size: number; // in BTC
  leverage: number;
  entryPrice: number;
  liquidationPrice: number;
  margin: number;
  unrealizedPnl: number;
  stopLoss?: number;
  takeProfit?: number;
  createdAt: string;
}

export interface LiquidityPoolState {
  usdt: number;
  usdt_sol: number;
  totalLpTokens: number;
}
