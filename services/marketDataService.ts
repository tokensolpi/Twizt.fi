
import { OrderBookEntry, OrderType, Trade, MarketDataState } from '../types';

interface InternalMarketState {
  price: number;
  open_24h: number;
  high_24h: number;
  low_24h: number;
  trades: Trade[];
}

let marketState: InternalMarketState | null = null;

/**
 * Initializes the market simulation with a real starting price.
 * @param initialPrice The price to start the simulation from.
 */
export const initializeMarket = (initialPrice: number) => {
    const priceVariation = initialPrice * 0.03; // Use a 3% variation for 24h data
    marketState = {
        price: initialPrice,
        open_24h: initialPrice - (priceVariation / 2) + (Math.random() * priceVariation),
        high_24h: initialPrice + (Math.random() * (priceVariation / 2)),
        low_24h: initialPrice - (Math.random() * (priceVariation / 2)),
        trades: [],
    };
    // Ensure 24h high/low are logical relative to the starting price
    if (marketState.low_24h > initialPrice) marketState.low_24h = initialPrice - (priceVariation * 0.1);
    if (marketState.high_24h < initialPrice) marketState.high_24h = initialPrice + (priceVariation * 0.1);
};


const generateSupportingMarketData = (currentPrice: number, previousTrades: Trade[]) => {
    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];
    let currentBid = currentPrice - Math.random() * 0.5;
    let currentAsk = currentPrice + Math.random() * 0.5;

    for (let i = 0; i < 15; i++) {
        const bidAmount = Math.random() * 2;
        bids.push({ price: currentBid, amount: bidAmount, total: currentBid * bidAmount });
        currentBid -= (Math.random() * 2);

        const askAmount = Math.random() * 2;
        asks.push({ price: currentAsk, amount: askAmount, total: currentAsk * askAmount });
        currentAsk += (Math.random() * 2);
    }

    const newTrade: Trade = {
        price: currentPrice + (Math.random() - 0.5) * 5,
        amount: Math.random() * 0.5,
        type: Math.random() > 0.5 ? OrderType.BUY : OrderType.SELL,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    const updatedTrades = [newTrade, ...previousTrades].slice(0, 20);

    return {
        bids: bids.sort((a, b) => b.price - a.price),
        asks: asks.sort((a, b) => a.price - b.price),
        trades: updatedTrades,
    };
};

export const generateMarketTick = (): MarketDataState => {
    if (!marketState) {
        throw new Error("Market state has not been initialized. Call initializeMarket first.");
    }
    
    // Simulate price fluctuation
    const change = (Math.random() - 0.49) * (marketState.price * 0.0005);
    const newPrice = marketState.price + change;

    // Update 24h high/low
    marketState.high_24h = Math.max(marketState.high_24h, newPrice);
    marketState.low_24h = Math.min(marketState.low_24h, newPrice);
    marketState.price = newPrice;
    
    const price_24h_change = marketState.price - marketState.open_24h;
    const price_24h_change_percent = (price_24h_change / marketState.open_24h) * 100;

    const { bids, asks, trades } = generateSupportingMarketData(marketState.price, marketState.trades);
    marketState.trades = trades;

    return {
        price: marketState.price,
        price_24h_change,
        price_24h_change_percent,
        high_24h: marketState.high_24h,
        low_24h: marketState.low_24h,
        bids,
        asks,
        trades,
    };
};
