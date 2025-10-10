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
  futuresBids: [],
  futuresAsks: [],
  trades: [],
  indexPrice: 0,
  fundingRate: 0,
  nextFundingTime: 0,
  openInterest: 0,
};

// Helper to generate synthetic data around the real price
const generateSyntheticMarketData = (indexPrice: number, previousTrades: Trade[]) => {
    // Mark price can deviate slightly from index price
    const markPrice = indexPrice * (1 + (Math.random() - 0.5) * 0.0001);
    
    // Spot data generation
    const spotBids: OrderBookEntry[] = [];
    const spotAsks: OrderBookEntry[] = [];
    const spotSpread = markPrice * 0.0005; // Tighter spread for spot
    let currentSpotBid = markPrice - (Math.random() * spotSpread);
    let currentSpotAsk = markPrice + (Math.random() * spotSpread);
    for (let i = 0; i < 15; i++) {
        const bidAmount = Math.random() * (markPrice > 1000 ? 0.5 : 5);
        spotBids.push({ price: currentSpotBid, amount: bidAmount, total: currentSpotBid * bidAmount });
        currentSpotBid -= (Math.random() * spotSpread * 1.5);

        const askAmount = Math.random() * (markPrice > 1000 ? 0.5 : 5);
        spotAsks.push({ price: currentSpotAsk, amount: askAmount, total: currentSpotAsk * askAmount });
        currentSpotAsk += (Math.random() * spotSpread * 1.5);
    }

    // Futures data generation (centered around markPrice)
    const futuresBids: OrderBookEntry[] = [];
    const futuresAsks: OrderBookEntry[] = [];
    const futuresSpread = markPrice * 0.001; // Wider spread for futures
    let currentFuturesBid = markPrice - (Math.random() * futuresSpread * 1.5);
    let currentFuturesAsk = markPrice + (Math.random() * futuresSpread * 1.5);

    for (let i = 0; i < 15; i++) {
        const bidAmount = Math.random() * (markPrice > 1000 ? 1.5 : 15); // Larger size
        futuresBids.push({ price: currentFuturesBid, amount: bidAmount, total: currentFuturesBid * bidAmount });
        currentFuturesBid -= (Math.random() * futuresSpread * 2.5);

        const askAmount = Math.random() * (markPrice > 1000 ? 1.5 : 15);
        futuresAsks.push({ price: currentFuturesAsk, amount: askAmount, total: currentFuturesAsk * askAmount });
        currentFuturesAsk += (Math.random() * futuresSpread * 2.5);
    }


    const newTrade: Trade = {
        price: markPrice + (Math.random() - 0.5) * spotSpread,
        amount: Math.random() * (markPrice > 1000 ? 0.5 : 5),
        type: Math.random() > 0.5 ? OrderType.BUY : OrderType.SELL,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    const updatedTrades = [newTrade, ...previousTrades].slice(0, 20);
    
    // Perps data
    const fundingRate = (Math.random() - 0.5) * 0.0005; // e.g., from -0.025% to +0.025%
    const baseOpenInterest = (indexPrice > 1000 ? 5000 : 100000) * (1 + Math.random() * 0.2);
    const openInterest = baseOpenInterest + (Math.random() - 0.5) * (baseOpenInterest * 0.01);


    return {
        markPrice,
        fundingRate,
        openInterest,
        bids: spotBids.sort((a, b) => b.price - a.price),
        asks: spotAsks.sort((a, b) => a.price - b.price),
        futuresBids: futuresBids.sort((a, b) => b.price - a.price),
        futuresAsks: futuresAsks.sort((a, b) => a.price - b.price),
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

  // Use a ref to store session-specific data like the 24h open price and funding time
  const sessionData = useRef<{ open_24h: number; trades: Trade[]; nextFundingTime: number; }>({ open_24h: 0, trades: [], nextFundingTime: 0 });

  useEffect(() => {
    let intervalId: number | undefined;

    const startOracleConnection = async (pair: string) => {
      setIsLoading(true);
      if (intervalId) window.clearInterval(intervalId);

      try {
        const initialIndexPrice = await getOraclePrice(pair);

        // Set the next funding time to the top of the next hour on first load
        if (sessionData.current.nextFundingTime === 0) {
            const now = new Date();
            const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
            sessionData.current.nextFundingTime = nextHour.getTime();
        }
        
        sessionData.current = { ...sessionData.current, open_24h: initialIndexPrice, trades: [] };
        
        const syntheticData = generateSyntheticMarketData(initialIndexPrice, sessionData.current.trades);
        sessionData.current.trades = syntheticData.trades;

        setMarketData({
            price: syntheticData.markPrice,
            indexPrice: initialIndexPrice,
            price_24h_change: 0,
            price_24h_change_percent: 0,
            high_24h: syntheticData.markPrice,
            low_24h: syntheticData.markPrice,
            fundingRate: syntheticData.fundingRate,
            openInterest: syntheticData.openInterest,
            nextFundingTime: sessionData.current.nextFundingTime,
            ...syntheticData
        });
        
        setIsLoading(false);

        intervalId = window.setInterval(async () => {
          try {
            const newIndexPrice = await getOraclePrice(pair);

            // Check if funding time has passed and reset it for the next hour
            if (Date.now() > sessionData.current.nextFundingTime) {
                const now = new Date();
                const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
                sessionData.current.nextFundingTime = nextHour.getTime();
            }

            const { open_24h } = sessionData.current;
            const newSyntheticData = generateSyntheticMarketData(newIndexPrice, sessionData.current.trades);
            sessionData.current.trades = newSyntheticData.trades;
            
            const price_24h_change = newSyntheticData.markPrice - open_24h;
            const price_24h_change_percent = (price_24h_change / open_24h) * 100;

            setMarketData(prev => ({
                price: newSyntheticData.markPrice,
                indexPrice: newIndexPrice,
                price_24h_change,
                price_24h_change_percent,
                high_24h: Math.max(prev.high_24h, newSyntheticData.markPrice),
                low_24h: Math.min(prev.low_24h, newSyntheticData.markPrice),
                fundingRate: newSyntheticData.fundingRate,
                openInterest: newSyntheticData.openInterest,
                nextFundingTime: sessionData.current.nextFundingTime,
                ...newSyntheticData
            }));
          } catch (e) {
            console.error("Failed to fetch oracle price update:", e);
          }
        }, 8000);

      } catch (e) {
        console.error(`Failed to initialize market data for ${pair} from oracle.`, e);
        setIsLoading(false);
      }
    };

    startOracleConnection(currentPair);

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