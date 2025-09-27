
// Fix: Removed self-import of types that was causing declaration conflicts.

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
  pair: string;
  type: OrderType;
  price: number;
  amount: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  filledAt?: string;
  botId?: string; // Identifier for market maker bot orders
}

export interface Balances {
  usdt: number;
  btc: number;
  eth: number;
  sol: number;
  bnb: number;
  doge: number;
  usdt_sol: number;
  gdp: number; // Twizted Divergence LP Token
}

export enum PositionSide {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export interface FuturesPosition {
  id: string;
  pair: string;
  side: PositionSide;
  size: number; // in base asset
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

export interface MarketMakerBot {
  id: string;
  isActive: boolean;
  priceRangeLower: number;
  priceRangeUpper: number;
  spread: number; // Percentage
  orderAmount: number; // Amount of BTC per order
  inventory: {
    usdt: number;
    btc: number;
  };
  orderIds: string[];
}


// Encapsulates all state related to a single trading account (real or paper)
export interface TradingState {
  balances: Balances;
  openOrders: Order[];
  orderHistory: Order[];
  futuresPositions: FuturesPosition[];
  marketMakerBots: MarketMakerBot[];
  // New DeFi state
  suppliedAssets: Partial<Record<keyof Balances, number>>;
  borrowedAssets: Partial<Record<keyof Balances, number>>;
  stakedGdp: number;
  gdpRewards: number;
}


// For AI Price Predictions
export interface PredictionResult {
  predictedPrice: number;
  confidence: string;
  analysis: string;
}

// For Lend/Borrow markets
export interface LendingMarketAsset {
  asset: keyof Balances;
  name: string;
  supplyApy: number;
  borrowApy: number;
  collateralFactor: number; // e.g., 0.8 for 80%
  totalSupplied: number;
  totalBorrowed: number;
  price: number; // Live price of the asset
}

// For Infura Gas API
export interface GasFeeSuggestion {
  suggestedMaxPriorityFeePerGas: string;
  suggestedMaxFeePerGas: string;
}

export interface GasPrices {
  low: GasFeeSuggestion;
  medium: GasFeeSuggestion;
  high: GasFeeSuggestion;
}
