

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { MarketDataState, OrderBookEntry, OrderType, Trade } from '../types';
import { getOraclePrice } from '../services/oracleService';
import { TRADING_PAIRS } from '../constants';

const initialState: MarketDataState = {
  price: 0,
  price_24h_change: 0,
  price_24h_change_percent: 0,
  high_24h: 0,
  low_24h: 0,
  bids: [],
  asks: [],
  trades: [],
};

// Helper to generate synthetic data around the real price
const generateSyntheticMarketData = (currentPrice: number, previousTrades: Trade[]) => {
    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];
    const pricePrecision = currentPrice > 10 ? 2 : 5;
    const spread = currentPrice * 0.0005;
    let currentBid = currentPrice - (Math.random() * spread);
    let currentAsk = currentPrice + (Math.random() * spread);

    for (let i = 0; i < 15; i++) {
        const bidAmount = Math.random() * (currentPrice > 1000 ? 1 : 10);
        bids.push({ price: currentBid, amount: bidAmount, total: currentBid * bidAmount });
        currentBid -= (Math.random() * spread * 2);

        const askAmount = Math.random() * (currentPrice > 1000 ? 1 : 10);
        asks.push({ price: currentAsk, amount: askAmount, total: currentAsk * askAmount });
        currentAsk += (Math.random() * spread * 2);
    }

    const newTrade: Trade = {
        price: currentPrice + (Math.random() - 0.5) * spread,
        amount: Math.random() * (currentPrice > 1000 ? 0.5 : 5),
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


interface MarketContextValue {
  marketData: MarketDataState;
  isLoading: boolean;
  currentPair: string;
  setCurrentPair: (pair: string) => void;
}

const MarketDataContext = createContext<MarketContextValue>({
  marketData: initialState,
  isLoading: true,
  currentPair: TRADING_PAIRS[0],
  setCurrentPair: () => {},
});

export const useMarketData = () => useContext(MarketDataContext);

interface MarketDataProviderProps {
  children: ReactNode;
}

export const MarketDataProvider: React.FC<MarketDataProviderProps> = ({ children }) => {
  const [marketData, setMarketData] = useState<MarketDataState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPair, setCurrentPair] = useState<string>(TRADING_PAIRS[0]);

  // Use a ref to store session-specific data like the 24h open price
  const sessionData = useRef<{ open_24h: number; trades: Trade[] }>({ open_24h: 0, trades: [] });

  useEffect(() => {
    let intervalId: number | undefined;

    const startOracleConnection = async (pair: string) => {
      setIsLoading(true);
      if (intervalId) window.clearInterval(intervalId);

      try {
        const initialPrice = await getOraclePrice(pair);
        sessionData.current = { open_24h: initialPrice, trades: [] };
        
        const syntheticData = generateSyntheticMarketData(initialPrice, sessionData.current.trades);
        sessionData.current.trades = syntheticData.trades;

        setMarketData({
            price: initialPrice,
            price_24h_change: 0,
            price_24h_change_percent: 0,
            high_24h: initialPrice,
            low_24h: initialPrice,
            ...syntheticData
        });
        
        setIsLoading(false);

        intervalId = window.setInterval(async () => {
          try {
            const newPrice = await getOraclePrice(pair);
            const { open_24h } = sessionData.current;
            const price_24h_change = newPrice - open_24h;
            const price_24h_change_percent = (price_24h_change / open_24h) * 100;
            
            const newSyntheticData = generateSyntheticMarketData(newPrice, sessionData.current.trades);
            sessionData.current.trades = newSyntheticData.trades;

            setMarketData(prev => ({
                price: newPrice,
                price_24h_change,
                price_24h_change_percent,
                high_24h: Math.max(prev.high_24h, newPrice),
                low_24h: Math.min(prev.low_24h, newPrice),
                ...newSyntheticData
            }));
          } catch (e) {
            console.error("Failed to fetch oracle price update:", e);
            // Optionally clear interval if updates fail consistently
          }
        }, 8000);

      } catch (e) {
        console.error(`Failed to initialize market data for ${pair} from oracle.`, e);
        // Handle error state in UI if needed
        setIsLoading(false); // Stop loading even on error
      }
    };

    startOracleConnection(currentPair);

    // Cleanup interval on component unmount or pair change
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [currentPair]);

  return (
    <MarketDataContext.Provider value={{ marketData, isLoading, currentPair, setCurrentPair }}>
      {children}
    </MarketDataContext.Provider>
  );
};