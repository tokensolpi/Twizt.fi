import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Order, OrderStatus, OrderType, Balances, FuturesPosition, PositionSide, LiquidityPoolState } from '../types';
import { useMarketData } from './MarketDataContext';

interface TradeHistoryContextValue {
  balances: Balances;
  availableBalances: Balances;
  openOrders: Order[];
  orderHistory: Order[];
  futuresPositions: FuturesPosition[];
  liquidityPool: LiquidityPoolState;
  placeOrder: (order: { type: OrderType; price: number; amount: number }) => void;
  cancelOrder: (orderId: string) => void;
  openFuturesPosition: (data: { side: PositionSide; price: number; amount: number; leverage: number; stopLoss?: number; takeProfit?: number; }) => void;
  closeFuturesPosition: (positionId: string) => void;
  bridgeAssets: (amount: number) => Promise<void>;
  addLiquidity: (amount: number, asset: 'usdt' | 'usdt_sol') => void;
  removeLiquidity: (lpAmount: number, targetAsset: 'usdt' | 'usdt_sol') => void;
}

const TradeHistoryContext = createContext<TradeHistoryContextValue | undefined>(undefined);

export const useTradeHistory = () => {
  const context = useContext(TradeHistoryContext);
  if (!context) {
    throw new Error('useTradeHistory must be used within a TradeHistoryProvider');
  }
  return context;
};

export const TradeHistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { marketData } = useMarketData();
  const [balances, setBalances] = useState<Balances>({ usdt: 10000, btc: 0.5, usdt_sol: 0, gdp: 0 });
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [futuresPositions, setFuturesPositions] = useState<FuturesPosition[]>([]);
  const [liquidityPool, setLiquidityPool] = useState<LiquidityPoolState>({ usdt: 500000, usdt_sol: 250000, totalLpTokens: 750000 });

  // Spot Order Logic
  const placeOrder = useCallback((orderData: { type: OrderType; price: number; amount: number }) => {
    const newOrder: Order = {
      id: crypto.randomUUID(), ...orderData, total: orderData.price * orderData.amount,
      status: OrderStatus.OPEN, createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setOpenOrders(prev => [newOrder, ...prev]);
  }, []);

  const cancelOrder = useCallback((orderId: string) => {
    setOpenOrders(prevOrders => {
      const orderToCancel = prevOrders.find(o => o.id === orderId);
      if (orderToCancel) {
        setOrderHistory(prevHistory => [{ ...orderToCancel, status: OrderStatus.CANCELLED }, ...prevHistory]);
      }
      return prevOrders.filter(o => o.id !== orderId);
    });
  }, []);

  // Futures Position Logic
  const openFuturesPosition = useCallback((data: { side: PositionSide; price: number; amount: number; leverage: number; stopLoss?: number; takeProfit?: number; }) => {
    const { side, price, amount, leverage, stopLoss, takeProfit } = data;
    const margin = (price * amount) / leverage;

    const liquidationPrice = side === PositionSide.LONG
      ? price * (1 - (1 / leverage) * 0.95) // Adding a buffer to avoid immediate liquidation
      : price * (1 + (1 / leverage) * 0.95);

    const newPosition: FuturesPosition = {
      id: crypto.randomUUID(), side, size: amount, leverage, entryPrice: price, margin,
      liquidationPrice, unrealizedPnl: 0, stopLoss, takeProfit,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setFuturesPositions(prev => [newPosition, ...prev]);
  }, []);
  
  const closeFuturesPosition = useCallback((positionId: string) => {
    const positionToClose = futuresPositions.find(p => p.id === positionId);
    if (!positionToClose) return;

    const pnl = positionToClose.side === PositionSide.LONG
        ? (marketData.price - positionToClose.entryPrice) * positionToClose.size
        : (positionToClose.entryPrice - marketData.price) * positionToClose.size;

    setBalances(prev => ({ ...prev, usdt: prev.usdt + positionToClose.margin + pnl }));
    
    setOrderHistory(prev => [{
        id: positionToClose.id, type: positionToClose.side === PositionSide.LONG ? OrderType.BUY : OrderType.SELL,
        price: marketData.price, amount: positionToClose.size, total: marketData.price * positionToClose.size,
        status: OrderStatus.FILLED, createdAt: positionToClose.createdAt,
        filledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }, ...prev]);

    setFuturesPositions(prev => prev.filter(p => p.id !== positionId));
}, [marketData.price, futuresPositions]);

 // Wormhole Bridge Simulation
 const bridgeAssets = useCallback(async (amount: number) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const fee = 5; // Simulated bridge fee
        setBalances(prev => ({
          ...prev,
          usdt: prev.usdt - amount,
          usdt_sol: prev.usdt_sol + (amount - fee)
        }));
        resolve();
      }, 3000); // 3-second delay to simulate transaction time
    });
  }, []);
  
  // Liquidity Pool Logic
  const addLiquidity = useCallback((amount: number, asset: 'usdt' | 'usdt_sol') => {
    const totalPoolValue = liquidityPool.usdt + liquidityPool.usdt_sol;
    // Price of one LP token is the total value divided by the number of tokens
    const lpTokenPrice = totalPoolValue > 0 ? totalPoolValue / liquidityPool.totalLpTokens : 1;

    const lpTokensToMint = amount / lpTokenPrice;

    setBalances(prev => ({
        ...prev,
        [asset]: prev[asset] - amount,
        gdp: prev.gdp + lpTokensToMint,
    }));

    setLiquidityPool(prev => ({
        ...prev,
        [asset]: prev[asset] + amount,
        totalLpTokens: prev.totalLpTokens + lpTokensToMint,
    }));

  }, [liquidityPool]);

  const removeLiquidity = useCallback((lpAmount: number, targetAsset: 'usdt' | 'usdt_sol') => {
      const totalPoolValue = liquidityPool.usdt + liquidityPool.usdt_sol;
      const lpTokenPrice = totalPoolValue > 0 ? totalPoolValue / liquidityPool.totalLpTokens : 1;
      
      const valueToReturn = lpAmount * lpTokenPrice;
      const userShare = lpAmount / liquidityPool.totalLpTokens;

      const usdtToReturn = userShare * liquidityPool.usdt;
      const usdtSolToReturn = userShare * liquidityPool.usdt_sol;

      // In a real scenario, you might return proportional assets, but here we simplify
      // by allowing the user to choose their withdrawal asset, assuming pool has enough liquidity
      if ( (targetAsset === 'usdt' && liquidityPool.usdt < valueToReturn) ||
           (targetAsset === 'usdt_sol' && liquidityPool.usdt_sol < valueToReturn) ) {
        throw new Error("Not enough liquidity of the target asset in the pool.");
      }
      
      setBalances(prev => ({
          ...prev,
          gdp: prev.gdp - lpAmount,
          [targetAsset]: prev[targetAsset] + valueToReturn,
      }));

      setLiquidityPool(prev => ({
          usdt: prev.usdt - usdtToReturn,
          usdt_sol: prev.usdt_sol - usdtSolToReturn,
          totalLpTokens: prev.totalLpTokens - lpAmount,
      }));

  }, [liquidityPool]);


  const availableBalances = useMemo(() => {
    const lockedForSpot = openOrders.reduce((acc, order) => {
        if (order.type === OrderType.BUY) { acc.usdt += order.total; } 
        else { acc.btc += order.amount; }
        return acc;
      }, { usdt: 0, btc: 0 });
    
    const marginForFutures = futuresPositions.reduce((acc, pos) => acc + pos.margin, 0);

    return {
      usdt: balances.usdt - lockedForSpot.usdt - marginForFutures,
      btc: balances.btc - lockedForSpot.btc,
      usdt_sol: balances.usdt_sol,
      gdp: balances.gdp,
    };
  }, [balances, openOrders, futuresPositions]);

  // Effect for processing spot orders
  useEffect(() => {
    const currentPrice = marketData.price;
    if (currentPrice === 0 || openOrders.length === 0) return;
    const ordersToFill = openOrders.filter(order => 
      (order.type === OrderType.BUY && currentPrice <= order.price) ||
      (order.type === OrderType.SELL && currentPrice >= order.price)
    );

    if (ordersToFill.length > 0) {
      setOpenOrders(prev => prev.filter(o => !ordersToFill.some(f => f.id === o.id)));
      const filledOrders = ordersToFill.map(o => ({
        ...o, status: OrderStatus.FILLED,
        filledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }));
      setOrderHistory(prev => [...filledOrders, ...prev]);
      setBalances(prevBalances => filledOrders.reduce((acc, order) => {
          if (order.type === OrderType.BUY) {
            return { ...acc, usdt: acc.usdt - order.total, btc: acc.btc + order.amount };
          } else {
            return { ...acc, usdt: acc.usdt + order.total, btc: acc.btc - order.amount };
          }
        }, prevBalances)
      );
    }
  }, [marketData.price, openOrders]);

  // Effect for updating futures PnL and handling liquidations/SL/TP
  useEffect(() => {
    if (futuresPositions.length === 0 || marketData.price === 0) return;

    const remainingPositions: FuturesPosition[] = [];
    const closedPositions: { position: FuturesPosition, closePrice: number, status: OrderStatus }[] = [];

    futuresPositions.forEach(pos => {
      let isClosed = false;
      let closePrice = 0;
      let status: OrderStatus = OrderStatus.FILLED;

      // 1. Check for Liquidation
      const isLiquidated = pos.side === PositionSide.LONG
        ? marketData.price <= pos.liquidationPrice
        : marketData.price >= pos.liquidationPrice;
      if (isLiquidated) {
        isClosed = true;
        closePrice = pos.liquidationPrice;
        status = OrderStatus.LIQUIDATED;
      }

      // 2. Check for Stop Loss
      if (!isClosed && pos.stopLoss) {
        const slTriggered = pos.side === PositionSide.LONG ? marketData.price <= pos.stopLoss : marketData.price >= pos.stopLoss;
        if (slTriggered) {
          isClosed = true;
          closePrice = pos.stopLoss;
          status = OrderStatus.FILLED;
        }
      }

      // 3. Check for Take Profit
      if (!isClosed && pos.takeProfit) {
        const tpTriggered = pos.side === PositionSide.LONG ? marketData.price >= pos.takeProfit : marketData.price <= pos.takeProfit;
        if (tpTriggered) {
          isClosed = true;
          closePrice = pos.takeProfit;
          status = OrderStatus.FILLED;
        }
      }

      if (isClosed) {
        closedPositions.push({ position: pos, closePrice, status });
      } else {
        const unrealizedPnl = pos.side === PositionSide.LONG
          ? (marketData.price - pos.entryPrice) * pos.size
          : (pos.entryPrice - marketData.price) * pos.size;
        remainingPositions.push({ ...pos, unrealizedPnl });
      }
    });

    if (closedPositions.length > 0) {
      setBalances(prevBalances => 
        closedPositions.reduce((acc, { position, closePrice, status }) => {
          if (status === OrderStatus.LIQUIDATED) {
            return acc; // Margin is lost
          }
          const pnl = position.side === PositionSide.LONG
            ? (closePrice - position.entryPrice) * position.size
            : (position.entryPrice - closePrice) * position.size;
          return { ...acc, usdt: acc.usdt + position.margin + pnl };
        }, prevBalances)
      );

      const newHistoryItems = closedPositions.map(({ position, closePrice, status }) => ({
        id: position.id, type: position.side === PositionSide.LONG ? OrderType.BUY : OrderType.SELL,
        price: closePrice, amount: position.size,
        total: status === OrderStatus.LIQUIDATED ? position.margin : closePrice * position.size,
        status, createdAt: position.createdAt,
        filledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }));
      setOrderHistory(prev => [...newHistoryItems, ...prev]);
    }

    setFuturesPositions(remainingPositions);
  }, [marketData.price, futuresPositions]);


  const value = {
    balances, availableBalances, openOrders, orderHistory, futuresPositions, liquidityPool,
    placeOrder, cancelOrder, openFuturesPosition, closeFuturesPosition, bridgeAssets,
    addLiquidity, removeLiquidity,
  };

  return <TradeHistoryContext.Provider value={value}>{children}</TradeHistoryContext.Provider>;
};