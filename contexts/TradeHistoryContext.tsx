
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { Order, OrderStatus, OrderType, Balances, FuturesPosition, PositionSide, LiquidityPoolState, MarketMakerBot, TradingState, LendingMarketAsset } from '../types';
import { useMarketData } from './MarketDataContext';
import { getOraclePrices } from '../services/oracleService';
import { useWallet } from './WalletContext';
import { TOKEN_CONTRACTS_ARBITRUM, MINIMAL_ERC20_ABI } from '../constants';

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
  realPnl: PaperPnl;
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
  balances: { usdt: 0, btc: 0, eth: 0, sol: 0, bnb: 0, doge: 0, usdt_sol: 0, gdp: 0 },
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
  const { provider, address, isConnected } = useWallet();
  const [isPaperTrading, setIsPaperTrading] = useState(true);
  const [assetPrices, setAssetPrices] = useState<Record<string, number>>({});

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
  const initialRealValueRef = useRef<number | null>(null);

  // Common state not part of paper/real modes
  const [liquidityPool, setLiquidityPool] = useState<LiquidityPoolState>({ usdt: 500000, usdt_sol: 250000, totalLpTokens: 750000 });
  
  // Fetch live prices for all assets for accurate calculations
  useEffect(() => {
    const fetchPrices = async () => {
        try {
            const prices = await getOraclePrices();
            setAssetPrices(prices);
        } catch (error) {
            console.error("Failed to fetch asset prices", error);
        }
    };
    fetchPrices();
    const intervalId = setInterval(fetchPrices, 30000); // Update every 30 seconds
    return () => clearInterval(intervalId);
  }, []);

  // Effect to fetch REAL balances when wallet is connected
  useEffect(() => {
    if (isConnected && provider && address) {
      const fetchBalances = async () => {
        try {
          const ethBalance = await provider.getBalance(address);
          const fetchedBalances: Balances = { 
              ...initialRealState.balances, // start with a clean slate of all tokens
              eth: parseFloat(ethers.formatEther(ethBalance)),
          };

          for (const [asset, contractInfo] of Object.entries(TOKEN_CONTRACTS_ARBITRUM)) {
            const contract = new ethers.Contract(contractInfo.address, MINIMAL_ERC20_ABI, provider);
            const balance = await contract.balanceOf(address);
            fetchedBalances[asset as keyof Balances] = parseFloat(ethers.formatUnits(balance, contractInfo.decimals));
          }

          setRealState(prevState => ({
            ...prevState,
            balances: fetchedBalances,
          }));

        } catch (error) {
          console.error("Failed to fetch wallet balances:", error);
        }
      };

      fetchBalances();
      const balanceInterval = setInterval(fetchBalances, 60000); // Refresh every 60s
      return () => clearInterval(balanceInterval);

    } else {
      // If wallet disconnects, reset real state and PNL baseline
      setRealState(initialRealState);
      initialRealValueRef.current = null;
    }
  }, [isConnected, provider, address]);

  // Effect to set initial portfolio value for PnL calculation for REAL account
  useEffect(() => {
    if (!isPaperTrading && isConnected && initialRealValueRef.current === null && Object.keys(assetPrices).length > 2) {
        // FIX: Explicitly cast balance value to number to prevent type errors.
        const totalBalanceValue = Object.values(realState.balances).reduce((a, b) => a + (Number(b) || 0), 0);
        if (totalBalanceValue > 0) { // Check if balances are actually populated
            const initialValue = Object.entries(realState.balances).reduce((total, [asset, amount]) => {
                const priceKey = asset.toUpperCase().split('_')[0];
                const price = assetPrices[priceKey] || (asset.includes('usdt') ? 1 : 0);
                // FIX: Explicitly cast `amount` to `number` to resolve TS inference issue.
                return total + (Number(amount) * price);
            }, 0);
            initialRealValueRef.current = initialValue;
        }
    }
    // Reset if we switch back to paper trading or disconnect
    if(isPaperTrading || !isConnected) {
        initialRealValueRef.current = null;
    }
  }, [isPaperTrading, isConnected, realState.balances, assetPrices]);


  useEffect(() => {
    const assetNames: Record<string, string> = { usdt: 'Tether', btc: 'Bitcoin', eth: 'Ethereum', sol: 'Solana' };
    setLendingMarket(
      LENDING_MARKET_CONFIG.map(config => ({
        ...config,
        price: assetPrices[config.asset.toUpperCase()] || 0,
        name: assetNames[config.asset] || 'Unknown',
        totalSupplied: 1000000 / (assetPrices[config.asset.toUpperCase()] || 1), // Simulated total supplied
        totalBorrowed: 500000 / (assetPrices[config.asset.toUpperCase()] || 1), // Simulated total borrowed
      }))
    );
  }, [assetPrices]);

  // Save paper state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(PAPER_STATE_KEY, JSON.stringify(paperState));
  }, [paperState]);
  
  const toggleTradeMode = () => {
    setIsPaperTrading(prev => {
        const newModeIsPaper = !prev;
        if(newModeIsPaper && !localStorage.getItem(PAPER_INITIAL_VALUE_KEY)) {
             const initialValue = initialPaperState.balances.usdt + initialPaperState.balances.btc * (assetPrices['BTC'] || 0);
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
        const initialValue = initialPaperState.balances.usdt + initialPaperState.balances.btc * (assetPrices['BTC'] || 0);
        localStorage.setItem(PAPER_INITIAL_VALUE_KEY, JSON.stringify(initialValue));
    }
  };

  const { balances, openOrders, orderHistory, futuresPositions, marketMakerBots, suppliedAssets, borrowedAssets, stakedGdp, gdpRewards } = isPaperTrading ? paperState : realState;
  const setState = isPaperTrading ? setPaperState : setRealState;
  
  // Spot Order Logic
  const placeOrder = useCallback((orderData: { type: OrderType; price: number; amount: number; pair: string; }, botId?: string): Order | undefined => {
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

    const baseAsset = positionToClose.pair.split('/')[0];
    const closePrice = assetPrices[baseAsset] || marketData.price; // Use live price if available

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
}, [marketData.price, futuresPositions, setState, currentPair, assetPrices]);

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
      if (bot.id === botId) return { ...bot, isActive: !bot.isActive };
      return bot;
    })}));
  }, [setState]);

  const removeMarketMakerBot = useCallback((botId: string) => {
    const botToRemove = marketMakerBots.find(b => b.id === botId);
    if (!botToRemove) return;
    // Reclaim assets to main balance
    setState(prev => ({
        ...prev,
        balances: {
            ...prev.balances,
            usdt: prev.balances.usdt + botToRemove.inventory.usdt,
            btc: prev.balances.btc + botToRemove.inventory.btc
        },
        marketMakerBots: prev.marketMakerBots.filter(b => b.id !== botId),
    }));
    // Also cancel any open orders from this bot
    botToRemove.orderIds.forEach(orderId => cancelOrder(orderId, true));
  }, [marketMakerBots, setState, cancelOrder]);


  // Effect for running market simulation: order matching, futures updates, bot logic
  useEffect(() => {
    if (marketData.price === 0) return;

    // 1. Process open spot orders (realistic matching)
    setState(prevState => {
      let newState = { ...prevState };
      const ordersToProcess = [...newState.openOrders];

      ordersToProcess.forEach(order => {
        if (order.status !== OrderStatus.OPEN || order.pair !== currentPair) return;

        const shouldFill = (order.type === OrderType.BUY && marketData.price <= order.price) ||
                           (order.type === OrderType.SELL && marketData.price >= order.price);

        if (shouldFill) {
          const [baseAsset, quoteAsset] = order.pair.split('/');
          const baseAssetLower = baseAsset.toLowerCase() as keyof Balances;
          const quoteAssetLower = quoteAsset.toLowerCase() as keyof Balances;

          const newBalances = { ...newState.balances };
          if (order.type === OrderType.BUY) {
            newBalances[quoteAssetLower] -= order.total;
            newBalances[baseAssetLower] = (newBalances[baseAssetLower] || 0) + order.amount;
          } else { // SELL
            newBalances[quoteAssetLower] += order.total;
            newBalances[baseAssetLower] -= order.amount;
          }

          const filledOrder = { ...order, status: OrderStatus.FILLED, filledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
          
          let updatedBots = newState.marketMakerBots;
          if (order.botId) {
            updatedBots = newState.marketMakerBots.map(bot => {
              if (bot.id === order.botId) {
                const newInventory = { ...bot.inventory };
                if (order.type === OrderType.BUY) {
                  newInventory.usdt -= order.total;
                  newInventory.btc += order.amount;
                } else {
                  newInventory.usdt += order.total;
                  newInventory.btc -= order.amount;
                }
                return { ...bot, inventory: newInventory, orderIds: bot.orderIds.filter(id => id !== order.id) };
              }
              return bot;
            });
          }

          newState = {
            ...newState,
            balances: newBalances,
            openOrders: newState.openOrders.filter(o => o.id !== order.id),
            orderHistory: [filledOrder, ...newState.orderHistory],
            marketMakerBots: updatedBots,
          };
        }
      });
      return newState;
    });

    // 2. Update futures PNL and check for liquidations
    setState(prev => {
      const positionsToLiquidate: string[] = [];
      const updatedPositions = prev.futuresPositions.map(p => {
        const pnl = p.side === PositionSide.LONG
          ? (marketData.price - p.entryPrice) * p.size
          : (p.entryPrice - marketData.price) * p.size;
        
        if ((p.side === PositionSide.LONG && marketData.price <= p.liquidationPrice) || (p.side === PositionSide.SHORT && marketData.price >= p.liquidationPrice)) {
          positionsToLiquidate.push(p.id);
        }

        return { ...p, unrealizedPnl: pnl };
      });

      if (positionsToLiquidate.length > 0) {
        const liquidatedHistory = updatedPositions
          .filter(p => positionsToLiquidate.includes(p.id))
          .map(p => ({
            ...p,
            id: crypto.randomUUID(), type: p.side === PositionSide.LONG ? OrderType.SELL : OrderType.BUY,
            price: p.liquidationPrice, amount: p.size, total: p.liquidationPrice * p.size, status: OrderStatus.LIQUIDATED,
            filledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }));

        return {
          ...prev,
          futuresPositions: updatedPositions.filter(p => !positionsToLiquidate.includes(p.id)),
          orderHistory: [...liquidatedHistory, ...prev.orderHistory],
        };
      }
      return { ...prev, futuresPositions: updatedPositions };
    });

    // 3. Run market maker bot logic (BTC/USDT only for this simulation)
    if (currentPair === 'BTC/USDT') {
      marketMakerBots.forEach(bot => {
        if (!bot.isActive) return;

        // Cancel existing orders to replace them
        bot.orderIds.forEach(id => cancelOrder(id, true));
        
        const midPrice = marketData.price;
        const spreadValue = midPrice * (bot.spread / 100) / 2;
        const buyPrice = parseFloat((midPrice - spreadValue).toFixed(2));
        const sellPrice = parseFloat((midPrice + spreadValue).toFixed(2));
        
        const newOrderIds: string[] = [];

        if (buyPrice >= bot.priceRangeLower && bot.inventory.usdt >= buyPrice * bot.orderAmount) {
          const order = placeOrder({ type: OrderType.BUY, price: buyPrice, amount: bot.orderAmount, pair: currentPair }, bot.id);
          if (order) newOrderIds.push(order.id);
        }

        if (sellPrice <= bot.priceRangeUpper && bot.inventory.btc >= bot.orderAmount) {
          const order = placeOrder({ type: OrderType.SELL, price: sellPrice, amount: bot.orderAmount, pair: currentPair }, bot.id);
          if (order) newOrderIds.push(order.id);
        }
        
        setState(prev => ({
          ...prev,
          marketMakerBots: prev.marketMakerBots.map(b => b.id === bot.id ? { ...b, orderIds: newOrderIds } : b)
        }));
      });
    }

    // 4. Accrue staking rewards
    setState(prev => {
      if (prev.stakedGdp > 0) {
        const rewardsPerTick = (prev.stakedGdp * (STAKING_APY / 100) / 31536000) * 8; // APY / seconds_in_year * tick_duration
        return { ...prev, gdpRewards: prev.gdpRewards + rewardsPerTick };
      }
      return prev;
    });

  }, [marketData.price, isPaperTrading, currentPair]); // Re-run simulation on price/mode change

  const availableBalances = useMemo(() => {
    const lockedInOrders = openOrders.reduce((acc, order) => {
        if (order.type === OrderType.BUY) {
            acc.usdt += order.total;
        } else {
            const baseAsset = order.pair.split('/')[0].toLowerCase() as keyof Balances;
            acc[baseAsset] = (acc[baseAsset] || 0) + order.amount;
        }
        return acc;
    }, { usdt: 0 } as Partial<Balances>);

    const lockedInFutures = futuresPositions.reduce((acc, pos) => {
        acc.usdt += pos.margin;
        return acc;
    }, { usdt: 0 });

    const lockedInBots = marketMakerBots.reduce((acc, bot) => {
        acc.usdt += bot.inventory.usdt;
        acc.btc += bot.inventory.btc;
        return acc;
    }, { usdt: 0, btc: 0 });

    const supplied = Object.entries(suppliedAssets).reduce((acc, [asset, amount]) => {
        acc[asset as keyof Balances] = (acc[asset as keyof Balances] || 0) + Number(amount);
        return acc;
    }, {} as Partial<Balances>);
    
    const borrowed = Object.entries(borrowedAssets).reduce((acc, [asset, amount]) => {
        acc[asset as keyof Balances] = (acc[asset as keyof Balances] || 0) - Number(amount);
        return acc;
    }, {} as Partial<Balances>);

    const newBalances = { ...balances };
    for (const key in newBalances) {
        const asset = key as keyof Balances;
        newBalances[asset] -= (lockedInOrders[asset] || 0);
        newBalances[asset] -= (lockedInFutures[asset] || 0);
        newBalances[asset] -= (lockedInBots[asset] || 0);
        newBalances[asset] -= (supplied[asset] || 0);
        newBalances[asset] += (borrowed[asset] || 0);
        if (asset === 'gdp') {
            newBalances.gdp -= stakedGdp;
        }
    }
    return newBalances;
  }, [balances, openOrders, futuresPositions, marketMakerBots, suppliedAssets, borrowedAssets, stakedGdp]);

  // DeFi Methods
  const supplyAsset = (asset: keyof Balances, amount: number) => {
      if (amount > availableBalances[asset]) return;
      setState(prev => ({
          ...prev,
          suppliedAssets: { ...prev.suppliedAssets, [asset]: (prev.suppliedAssets[asset] || 0) + amount }
      }));
  };
  const withdrawAsset = (asset: keyof Balances, amount: number) => {
      if (amount > (suppliedAssets[asset] || 0)) return;
      setState(prev => ({
          ...prev,
          suppliedAssets: { ...prev.suppliedAssets, [asset]: (prev.suppliedAssets[asset] || 0) - amount }
      }));
  };
  const borrowAsset = (asset: keyof Balances, amount: number) => {
      setState(prev => ({
          ...prev,
          borrowedAssets: { ...prev.borrowedAssets, [asset]: (prev.borrowedAssets[asset] || 0) + amount }
      }));
  };
  const repayAsset = (asset: keyof Balances, amount: number) => {
      if (amount > (borrowedAssets[asset] || 0) || amount > availableBalances[asset]) return;
      setState(prev => ({
          ...prev,
          borrowedAssets: { ...prev.borrowedAssets, [asset]: (prev.borrowedAssets[asset] || 0) - amount }
      }));
  };

  const stakeGdp = (amount: number) => {
      if (amount > availableBalances.gdp) return;
      setState(prev => ({...prev, stakedGdp: prev.stakedGdp + amount}));
  };
  const unstakeGdp = (amount: number) => {
      if (amount > stakedGdp) return;
      setState(prev => ({...prev, stakedGdp: prev.stakedGdp - amount}));
  };
  const claimGdpRewards = () => {
      setState(prev => ({
          ...prev,
          balances: { ...prev.balances, gdp: prev.balances.gdp + prev.gdpRewards },
          gdpRewards: 0,
      }));
  };

  const calculatePortfolioValue = (state: TradingState): number => {
    // Sum of all balances valued in USDT
    const balanceValue = Object.entries(state.balances).reduce((total, [asset, amount]) => {
      const price = assetPrices[asset.toUpperCase().split('_')[0]] || (asset.includes('usdt') ? 1 : 0);
      return total + (Number(amount) * price);
    }, 0);
    // Add margin and PNL from futures
    const futuresValue = state.futuresPositions.reduce((total, pos) => total + pos.margin + pos.unrealizedPnl, 0);
    // Add value held in bots
    const botValue = state.marketMakerBots.reduce((total, bot) => total + bot.inventory.usdt + (bot.inventory.btc * (assetPrices['BTC'] || 0)), 0);
    // Add supplied assets and subtract borrowed assets
    const lendBorrowValue = Object.entries(state.suppliedAssets).reduce((total, [asset, amount]) => total + (Number(amount) * (assetPrices[asset.toUpperCase()] || 0)), 0)
                          - Object.entries(state.borrowedAssets).reduce((total, [asset, amount]) => total + (Number(amount) * (assetPrices[asset.toUpperCase()] || 0)), 0);
    
    return balanceValue + futuresValue + botValue + lendBorrowValue + (state.stakedGdp * (assetPrices['GDP'] || 1)); // Assume GDP price is 1 for now
  };
  
  const calculatePnl = (currentValue: number, initialValue: number): PaperPnl => {
      if (initialValue === 0) return { value: 0, percentage: 0 };
      const value = currentValue - initialValue;
      const percentage = (value / initialValue) * 100;
      return { value, percentage };
  };

  const paperPnl = useMemo(() => {
    const initialValue = parseFloat(localStorage.getItem(PAPER_INITIAL_VALUE_KEY) || '100000');
    if (Object.keys(assetPrices).length === 0) return { value: 0, percentage: 0 };
    const currentValue = calculatePortfolioValue(paperState);
    return calculatePnl(currentValue, initialValue);
  }, [paperState, assetPrices]);
  
  const realPnl = useMemo(() => {
    const initialValue = initialRealValueRef.current;
    if (initialValue === null || Object.keys(assetPrices).length === 0) return { value: 0, percentage: 0 };
    const currentValue = calculatePortfolioValue(realState);
    return calculatePnl(currentValue, initialValue);
  }, [realState, assetPrices]);


  const value = {
    balances, availableBalances, openOrders, orderHistory, futuresPositions, liquidityPool, marketMakerBots,
    isPaperTrading, paperPnl, realPnl,
    toggleTradeMode, resetPaperAccount, placeOrder, cancelOrder, openFuturesPosition, closeFuturesPosition,
    bridgeAssets, addLiquidity, removeLiquidity, createMarketMakerBot, toggleMarketMakerBot, removeMarketMakerBot,
    lendingMarket, suppliedAssets, borrowedAssets, stakedGdp, gdpRewards, stakingApy: STAKING_APY,
    supplyAsset, withdrawAsset, borrowAsset, repayAsset, stakeGdp, unstakeGdp, claimGdpRewards
  };

  return (
    <TradeHistoryContext.Provider value={value}>
      {children}
    </TradeHistoryContext.Provider>
  );
};
