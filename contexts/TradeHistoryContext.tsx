import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Order, OrderStatus, OrderType, Balances, FuturesPosition, PositionSide, LiquidityPoolState, MarketMakerBot, TradingState, LendingMarketAsset } from '../types';
import { useMarketData } from './MarketDataContext';

const LENDING_MARKET_CONFIG: Omit<LendingMarketAsset, 'totalSupplied' | 'totalBorrowed' | 'price' | 'name'>[] = [
    { asset: 'usdt', supplyApy: 4.5, borrowApy: 6.2, collateralFactor: 0.85 },
    { asset: 'btc', supplyApy: 1.2, borrowApy: 2.5, collateralFactor: 0.75 },
    { asset: 'eth', supplyApy: 2.1, borrowApy: 3.8, collateralFactor: 0.75 },
    { asset: 'sol', supplyApy: 3.5, borrowApy: 5.1, collateralFactor: 0.65 },
];
const STAKING_APY = 12.5;

interface PaperPnl {
  value: number;
  percentage: number;
}
interface TradeHistoryContextValue {
  balances: Balances;
  availableBalances: Balances;
  openOrders: Order[];
  orderHistory: Order[];
  futuresPositions: FuturesPosition[];
  liquidityPool: LiquidityPoolState;
  marketMakerBots: MarketMakerBot[];
  isPaperTrading: boolean;
  paperPnl: PaperPnl;
  toggleTradeMode: () => void;
  resetPaperAccount: () => void;
  placeOrder: (order: { type: OrderType; price: number; amount: number; pair: string; }) => Order | undefined;
  cancelOrder: (orderId: string) => void;
  openFuturesPosition: (data: { side: PositionSide; price: number; amount: number; leverage: number; pair: string; stopLoss?: number; takeProfit?: number; }) => void;
  closeFuturesPosition: (positionId: string) => void;
  bridgeAssets: (amount: number) => Promise<void>;
  addLiquidity: (amount: number, asset: 'usdt' | 'usdt_sol') => void;
  removeLiquidity: (lpAmount: number, targetAsset: 'usdt' | 'usdt_sol') => void;
  createMarketMakerBot: (config: { priceRangeLower: number; priceRangeUpper: number; spread: number; initialUsdt: number; orderAmount: number; }) => void;
  toggleMarketMakerBot: (botId: string) => void;
  removeMarketMakerBot: (botId: string) => void;

  // New DeFi properties and methods
  lendingMarket: LendingMarketAsset[];
  suppliedAssets: Partial<Record<keyof Balances, number>>;
  borrowedAssets: Partial<Record<keyof Balances, number>>;
  stakedGdp: number;
  gdpRewards: number;
  stakingApy: number;
  supplyAsset: (asset: keyof Balances, amount: number) => void;
  withdrawAsset: (asset: keyof Balances, amount: number) => void;
  borrowAsset: (asset: keyof Balances, amount: number) => void;
  repayAsset: (asset: keyof Balances, amount: number) => void;
  stakeGdp: (amount: number) => void;
  unstakeGdp: (amount: number) => void;
  claimGdpRewards: () => void;
}

const TradeHistoryContext = createContext<TradeHistoryContextValue | undefined>(undefined);

export const useTradeHistory = () => {
  const context = useContext(TradeHistoryContext);
  if (!context) {
    throw new Error('useTradeHistory must be used within a TradeHistoryProvider');
  }
  return context;
};

const initialRealState: TradingState = {
  balances: { usdt: 10000, btc: 0.5, eth: 10, sol: 50, bnb: 20, doge: 50000, usdt_sol: 0, gdp: 0 },
  openOrders: [], orderHistory: [], futuresPositions: [], marketMakerBots: [],
  suppliedAssets: {}, borrowedAssets: {}, stakedGdp: 0, gdpRewards: 0,
};

const initialPaperState: TradingState = {
  balances: { usdt: 100000, btc: 10, eth: 200, sol: 1000, bnb: 500, doge: 1000000, usdt_sol: 0, gdp: 0 },
  openOrders: [], orderHistory: [], futuresPositions: [], marketMakerBots: [],
  suppliedAssets: { usdt: 5000, btc: 1 }, borrowedAssets: { sol: 10 }, stakedGdp: 0, gdpRewards: 0,
};
const PAPER_STATE_KEY = 'twiztedDivergence_paperState';
const PAPER_INITIAL_VALUE_KEY = 'twiztedDivergence_paperInitialValue';


export const TradeHistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { marketData, currentPair } = useMarketData();
  const [isPaperTrading, setIsPaperTrading] = useState(false);

  const [realState, setRealState] = useState<TradingState>(initialRealState);
  const [paperState, setPaperState] = useState<TradingState>(() => {
    try {
      const saved = localStorage.getItem(PAPER_STATE_KEY);
      return saved ? JSON.parse(saved) : initialPaperState;
    } catch {
      return initialPaperState;
    }
  });
  
  const [lendingMarket, setLendingMarket] = useState<LendingMarketAsset[]>([]);

  // Common state not part of paper/real modes
  const [liquidityPool, setLiquidityPool] = useState<LiquidityPoolState>({ usdt: 500000, usdt_sol: 250000, totalLpTokens: 750000 });
  
  useEffect(() => {
    // This effect populates the lending market with live prices
    // In a real app, this data would come from oracles for each asset
    const btcPrice = currentPair === 'BTC/USDT' ? marketData.price : 68000; // approximation
    const ethPrice = currentPair === 'ETH/USDT' ? marketData.price : 3800;
    const solPrice = currentPair === 'SOL/USDT' ? marketData.price : 160;

    const assetPrices: Record<string, number> = {
        usdt: 1,
        btc: btcPrice,
        eth: ethPrice,
        sol: solPrice,
    };

    const assetNames: Record<string, string> = {
        usdt: 'Tether',
        btc: 'Bitcoin',
        eth: 'Ethereum',
        sol: 'Solana',
    };

    setLendingMarket(
      LENDING_MARKET_CONFIG.map(config => ({
        ...config,
        price: assetPrices[config.asset] || 0,
        name: assetNames[config.asset] || 'Unknown',
        totalSupplied: 1000000 / (assetPrices[config.asset] || 1), // Simulated total supplied
        totalBorrowed: 500000 / (assetPrices[config.asset] || 1), // Simulated total borrowed
      }))
    );
  }, [marketData.price, currentPair]);

  // Save paper state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(PAPER_STATE_KEY, JSON.stringify(paperState));
  }, [paperState]);
  
  const toggleTradeMode = () => {
    setIsPaperTrading(prev => {
        const newModeIsPaper = !prev;
        if(newModeIsPaper && !localStorage.getItem(PAPER_INITIAL_VALUE_KEY)) {
             const initialValue = initialPaperState.balances.usdt + initialPaperState.balances.btc * marketData.price;
             localStorage.setItem(PAPER_INITIAL_VALUE_KEY, JSON.stringify(initialValue));
        }
        return newModeIsPaper;
    });
  };

  const resetPaperAccount = () => {
    if (window.confirm("Are you sure you want to reset your paper trading account? All progress will be lost.")) {
        localStorage.removeItem(PAPER_STATE_KEY);
        localStorage.removeItem(PAPER_INITIAL_VALUE_KEY);
        setPaperState(initialPaperState);
        const initialValue = initialPaperState.balances.usdt + initialPaperState.balances.btc * marketData.price;
        localStorage.setItem(PAPER_INITIAL_VALUE_KEY, JSON.stringify(initialValue));
    }
  };

  const { balances, openOrders, orderHistory, futuresPositions, marketMakerBots, suppliedAssets, borrowedAssets, stakedGdp, gdpRewards } = isPaperTrading ? paperState : realState;
  const setState = isPaperTrading ? setPaperState : setRealState;
  
  // Spot Order Logic
  const placeOrder = useCallback((orderData: { type: OrderType; price: number; amount: number; pair: string; }, botId?: string): Order => {
    const newOrder: Order = {
      id: crypto.randomUUID(), ...orderData, total: orderData.price * orderData.amount,
      status: OrderStatus.OPEN, createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ...(botId && { botId }),
    };
    setState(prev => ({ ...prev, openOrders: [newOrder, ...prev.openOrders]}));
    return newOrder;
  }, [setState]);

  const cancelOrder = useCallback((orderId: string, silent = false) => {
    setState(prev => {
        const orderToCancel = prev.openOrders.find(o => o.id === orderId);
        const newHistory = (orderToCancel && !silent) 
            ? [{ ...orderToCancel, status: OrderStatus.CANCELLED }, ...prev.orderHistory] 
            : prev.orderHistory;
        return {
            ...prev,
            openOrders: prev.openOrders.filter(o => o.id !== orderId),
            orderHistory: newHistory,
        }
    });
  }, [setState]);

  // Futures Position Logic
  const openFuturesPosition = useCallback((data: { side: PositionSide; price: number; amount: number; leverage: number; pair: string; stopLoss?: number; takeProfit?: number; }) => {
    const { side, price, amount, leverage, pair, stopLoss, takeProfit } = data;
    const margin = (price * amount) / leverage;
    const liquidationPrice = side === PositionSide.LONG ? price * (1 - (1 / leverage) * 0.95) : price * (1 + (1 / leverage) * 0.95);
    const newPosition: FuturesPosition = {
      id: crypto.randomUUID(), side, size: amount, leverage, entryPrice: price, margin, pair,
      liquidationPrice, unrealizedPnl: 0, stopLoss, takeProfit,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setState(prev => ({ ...prev, futuresPositions: [newPosition, ...prev.futuresPositions] }));
  }, [setState]);
  
  const closeFuturesPosition = useCallback((positionId: string) => {
    const positionToClose = futuresPositions.find(p => p.id === positionId);
    if (!positionToClose) return;

    // NOTE: This uses the current market price of the *active* pair. This is a simplification.
    // A robust system would need a live price feed for every position's pair.
    const closePrice = positionToClose.pair === currentPair ? marketData.price : positionToClose.entryPrice;

    const pnl = positionToClose.side === PositionSide.LONG
        ? (closePrice - positionToClose.entryPrice) * positionToClose.size
        : (positionToClose.entryPrice - closePrice) * positionToClose.size;

    setState(prev => ({
        ...prev,
        balances: { ...prev.balances, usdt: prev.balances.usdt + positionToClose.margin + pnl },
        orderHistory: [{
            id: positionToClose.id, type: positionToClose.side === PositionSide.LONG ? OrderType.BUY : OrderType.SELL,
            price: closePrice, amount: positionToClose.size, total: closePrice * positionToClose.size,
            status: OrderStatus.FILLED, createdAt: positionToClose.createdAt, pair: positionToClose.pair,
            filledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        }, ...prev.orderHistory],
        futuresPositions: prev.futuresPositions.filter(p => p.id !== positionId),
    }));
}, [marketData.price, futuresPositions, setState, currentPair]);

 // Wormhole Bridge Simulation (operates on real balance only)
 const bridgeAssets = useCallback(async (amount: number) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const fee = 5; // Simulated bridge fee
        setRealState(prev => ({
          ...prev,
          balances: {
            ...prev.balances,
            usdt: prev.balances.usdt - amount,
            usdt_sol: prev.balances.usdt_sol + (amount - fee)
          }
        }));
        resolve();
      }, 3000);
    });
  }, []);
  
  // Liquidity Pool Logic (operates on real balance only)
  const addLiquidity = useCallback((amount: number, asset: 'usdt' | 'usdt_sol') => {
    const totalPoolValue = liquidityPool.usdt + liquidityPool.usdt_sol;
    const lpTokenPrice = totalPoolValue > 0 ? totalPoolValue / liquidityPool.totalLpTokens : 1;
    const lpTokensToMint = amount / lpTokenPrice;
    setRealState(prev => ({ ...prev, balances: { ...prev.balances, [asset]: prev.balances[asset] - amount, gdp: prev.balances.gdp + lpTokensToMint }}));
    setLiquidityPool(prev => ({ ...prev, [asset]: prev[asset] + amount, totalLpTokens: prev.totalLpTokens + lpTokensToMint }));
  }, [liquidityPool]);

  const removeLiquidity = useCallback((lpAmount: number, targetAsset: 'usdt' | 'usdt_sol') => {
      const totalPoolValue = liquidityPool.usdt + liquidityPool.usdt_sol;
      const lpTokenPrice = totalPoolValue > 0 ? totalPoolValue / liquidityPool.totalLpTokens : 1;
      const valueToReturn = lpAmount * lpTokenPrice;
      const userShare = lpAmount / liquidityPool.totalLpTokens;
      const usdtToReturn = userShare * liquidityPool.usdt;
      const usdtSolToReturn = userShare * liquidityPool.usdt_sol;
      if ( (targetAsset === 'usdt' && liquidityPool.usdt < valueToReturn) || (targetAsset === 'usdt_sol' && liquidityPool.usdt_sol < valueToReturn) ) {
        throw new Error("Not enough liquidity of the target asset in the pool.");
      }
      setRealState(prev => ({ ...prev, balances: { ...prev.balances, gdp: prev.balances.gdp - lpAmount, [targetAsset]: prev.balances[targetAsset] + valueToReturn } }));
      setLiquidityPool(prev => ({ usdt: prev.usdt - usdtToReturn, usdt_sol: prev.usdt_sol - usdtSolToReturn, totalLpTokens: prev.totalLpTokens - lpAmount }));
  }, [liquidityPool]);

  // Market Maker Bot Logic
  const createMarketMakerBot = useCallback((config: { priceRangeLower: number; priceRangeUpper: number; spread: number; initialUsdt: number; orderAmount: number; }) => {
    if (balances.usdt < config.initialUsdt) {
      alert("Insufficient USDT balance to create bot."); return;
    }
    const newBot: MarketMakerBot = {
      id: crypto.randomUUID(), isActive: true, ...config,
      inventory: { usdt: config.initialUsdt, btc: 0 }, orderIds: [],
    };
    setState(prev => ({
        ...prev,
        marketMakerBots: [...prev.marketMakerBots, newBot],
        balances: {...prev.balances, usdt: prev.balances.usdt - config.initialUsdt}
    }));
  }, [balances.usdt, setState]);

  const toggleMarketMakerBot = useCallback((botId: string) => {
    setState(prev => ({ ...prev, marketMakerBots: prev.marketMakerBots.map(bot => {
      if (