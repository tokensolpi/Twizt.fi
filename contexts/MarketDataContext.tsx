
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MarketDataState } from '../types';
import { initializeMarket, generateMarketTick } from '../services/marketDataService';
import { getInitialBtcPrice } from '../services/geminiService';

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

interface MarketContextValue {
  marketData: MarketDataState;
  isLoading: boolean;
}

const MarketDataContext = createContext<MarketContextValue>({
  marketData: initialState,
  isLoading: true,
});

export const useMarketData = () => useContext(MarketDataContext);

interface MarketDataProviderProps {
  children: ReactNode;
}

export const MarketDataProvider: React.FC<MarketDataProviderProps> = ({ children }) => {
  const [marketData, setMarketData] = useState<MarketDataState>(initialState);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let intervalId: number | undefined;

    const startSimulation = async () => {
      try {
        const initialPrice = await getInitialBtcPrice();
        initializeMarket(initialPrice);
        // Set the first tick of data immediately after initialization
        setMarketData(generateMarketTick());
      } catch (e) {
        console.error("Failed to initialize market data with live price, using fallback.", e);
        // Fallback initialization if Gemini fails for any reason
        initializeMarket(68500.00);
        setMarketData(generateMarketTick());
      } finally {
        setIsLoading(false);
        // After the first data is set and loading is false, start the interval for subsequent ticks
        // Fix: Use window.setInterval to ensure the return type is 'number' and not 'NodeJS.Timeout'.
        intervalId = window.setInterval(() => {
          setMarketData(generateMarketTick());
        }, 2000);
      }
    };

    startSimulation();

    // Cleanup interval on component unmount to prevent memory leaks
    return () => {
      if (intervalId) {
        // Fix: Use window.clearInterval to match window.setInterval.
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return (
    <MarketDataContext.Provider value={{ marketData, isLoading }}>
      {children}
    </MarketDataContext.Provider>
  );
};
