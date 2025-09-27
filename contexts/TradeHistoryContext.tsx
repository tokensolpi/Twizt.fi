import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { Order, OrderStatus, OrderType, Balances, FuturesPosition, PositionSide, LiquidityPoolState, MarketMakerBot, TradingState, LendingMarketAsset } from '../types';
import { useMarketData } from './MarketDataContext';
import { getOraclePrices } from '../services/oracleService';
import { useWallet } from './WalletContext';
import { TOKEN_CONTRACTS_ARBITRUM_SEPOLIA, MINIMAL_ERC20_ABI } from '../constants';

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

          for (const [asset, contractInfo] of Object.entries(TOKEN_CONTRACTS_ARBITRUM_SEPOLIA)) {
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
        const totalBalanceValue = Object.values(realState.balances).reduce((a,b) => a+b, 0);
        if (totalBalanceValue > 0) { // Check if balances are actually populated
            const initialValue = Object.entries(realState.balances).reduce((total, [asset, amount]) => {
                const priceKey = asset.toUpperCase().split('_')[0];
                const price = assetPrices[priceKey] || (asset.includes('usdt') ? 1 : 0);
                return total + (amount * price);
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
    const ordersToProcess = [...openOrders];
    ordersToProcess.forEach(order => {
      if (order.status !== OrderStatus.OPEN || order.pair !== currentPair) return;

      const shouldFill = (order.type === OrderType.BUY && marketData.price <= order.price) ||
                         (order.type === OrderType.SELL && marketData.price >= order.price);

      if (shouldFill) {
        setState(prev => {
          const [baseAsset, quoteAsset] = order.pair.split('/');
          const baseAssetLower = baseAsset.toLowerCase() as keyof Balances;
          const quoteAssetLower = quoteAsset.toLowerCase() as keyof Balances;

          const newBalances = { ...prev.balances };
          if (order.type === OrderType.BUY) {
            newBalances[quoteAssetLower] -= order.total;
            newBalances[baseAssetLower] = (newBalances[baseAssetLower] || 0) + order.amount;
          } else { // SELL
            newBalances[quoteAssetLower] += order.total;
            newBalances[baseAssetLower] -= order.amount;
          }

          const filledOrder = { ...order, status: OrderStatus.FILLED, filledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
          
          let updatedBots = prev.marketMakerBots;
          if (order.botId) {
              updatedBots = prev.marketMakerBots.map(bot => {
                  if (bot.id === order.botId) {
                      const newInventory = { ...bot.inventory };
                      if (order.type === OrderType.BUY) {
                          newInventory.usdt -= order.total;
                          newInventory.btc += order.amount;
                      } else { // SELL
                          newInventory.usdt += order.total;
                          newInventory.btc -= order.amount;
                      }
                      return { ...bot, inventory: newInventory };
                  }
                  return bot;
              });
          }

          return {
            ...prev,
            balances: newBalances,
            openOrders: prev.openOrders.filter(o => o.id !== order.id),
            orderHistory: [filledOrder, ...prev.orderHistory],
            marketMakerBots: updatedBots,
          };
        });
      }
    });

    // 2. Update futures positions (PNL, Liquidations, SL/TP)
    setState(prev => {
      let stateChanged = false;
      const newPositions = [...prev.futuresPositions];
      const newHistory = [...prev.orderHistory];
      const newBalances = { ...prev.balances };

      const updatedPositions = newPositions.map(position => {
        if (position.pair !== currentPair) {
             const baseAsset = position.pair.split('/')[0];
             const livePrice = assetPrices[baseAsset];
             if(!livePrice) return position; // Can't update if price is not available

             const unrealizedPnl = position.side === 'LONG'
                ? (livePrice - position.entryPrice) * position.size
                : (position.entryPrice - livePrice) * position.size;
             return { ...position, unrealizedPnl };
        }

        let unrealizedPnl = position.side === 'LONG'
          ? (marketData.price - position.entryPrice) * position.size
          : (position.entryPrice - marketData.price) * position.size;

        const isLiquidated = (position.side === 'LONG' && marketData.price <= position.liquidationPrice) ||
                             (position.side === 'SHORT' && marketData.price >= position.liquidationPrice);

        const isStopped = (position.stopLoss && position.side === 'LONG' && marketData.price <= position.stopLoss) ||
                          (position.stopLoss && position.side === 'SHORT' && marketData.price >= position.stopLoss);
                          
        const isTakenProfit = (position.takeProfit && position.side === 'LONG' && marketData.price >= position.takeProfit) ||
                              (position.takeProfit && position.side === 'SHORT' && marketData.price <= position.takeProfit);

        if (isLiquidated || isStopped || isTakenProfit) {
          stateChanged = true;
          const closePrice = isLiquidated ? position.liquidationPrice : (isStopped ? position.stopLoss! : position.takeProfit!);
          const finalPnl = position.side === 'LONG'
            ? (closePrice - position.entryPrice) * position.size
            : (position.entryPrice - closePrice) * position.size;
          
          newBalances.usdt += position.margin + finalPnl;
          
          newHistory.unshift({
              id: position.id, type: position.side === 'LONG' ? OrderType.BUY : OrderType.SELL,
              price: closePrice, amount: position.size, total: closePrice * position.size,
              status: isLiquidated ? OrderStatus.LIQUIDATED : OrderStatus.FILLED, createdAt: position.createdAt, pair: position.pair,
              filledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          });
          return null;
        }

        return { ...position, unrealizedPnl };
      }).filter(p => p !== null) as FuturesPosition[];

      if (stateChanged) {
        return { ...prev, futuresPositions: updatedPositions, orderHistory: newHistory, balances: newBalances };
      }
      // Just update PNL if no positions were closed
      return { ...prev, futuresPositions: updatedPositions };
    });
    
    // 3. Run market maker bots
    marketMakerBots.forEach(bot => {
        if (!bot.isActive || currentPair !== 'BTC/USDT') return; // Simplified: bot only works on BTC/USDT
        
        // Cancel old orders first
        bot.orderIds.forEach(id => cancelOrder(id, true));

        if (marketData.price > bot.priceRangeLower && marketData.price < bot.priceRangeUpper) {
            const buyPrice = marketData.price * (1 - bot.spread / 200);
            const sellPrice = marketData.price * (1 + bot.spread / 200);
            const newOrderIds: string[] = [];

            // Place buy order if bot has USDT
            if (bot.inventory.usdt > buyPrice * bot.orderAmount) {
                const buyOrder = placeOrder({ type: OrderType.BUY, price: buyPrice, amount: bot.orderAmount, pair: 'BTC/USDT' }, bot.id);
                if(buyOrder) newOrderIds.push(buyOrder.id);
            }
            // Place sell order if bot has BTC
            if (bot.inventory.btc > bot.orderAmount) {
                const sellOrder = placeOrder({ type: OrderType.SELL, price: sellPrice, amount: bot.orderAmount, pair: 'BTC/USDT' }, bot.id);
                if(sellOrder) newOrderIds.push(sellOrder.id);
            }
            
            setState(prev => ({ ...prev, marketMakerBots: prev.marketMakerBots.map(b => b.id === bot.id ? {...b, orderIds: newOrderIds} : b)}));
        }
    });

  }, [marketData.price, currentPair]); // Re-run simulation on price/pair change

  const availableBalances = useMemo(() => {
    const available = { ...balances };
    openOrders.forEach(order => {
        const [baseAsset, quoteAsset] = order.pair.split('/');
        const baseAssetLower = baseAsset.toLowerCase() as keyof Balances;
        const quoteAssetLower = quoteAsset.toLowerCase() as keyof Balances;
        if (order.type === OrderType.BUY) {
            available[quoteAssetLower] -= order.total;
        } else {
            available[baseAssetLower] -= order.amount;
        }
    });
     futuresPositions.forEach(position => {
        available.usdt -= position.margin;
    });
    return available;
  }, [balances, openOrders, futuresPositions]);

  const paperPnl = useMemo<PaperPnl>(() => {
    if (!isPaperTrading) return { value: 0, percentage: 0 };
    
    const initialValueStr = localStorage.getItem(PAPER_INITIAL_VALUE_KEY);
    const initialValue = initialValueStr ? JSON.parse(initialValueStr) : initialPaperState.balances.usdt;
    
    const currentPortfolioValue = Object.entries(paperState.balances).reduce((total, [asset, amount]) => {
        const priceKey = asset.toUpperCase().split('_')[0]; 
        const price = assetPrices[priceKey] || (asset.includes('usdt') ? 1 : 0);

        if (asset.toLowerCase() === 'gdp') {
            const totalPoolValue = liquidityPool.usdt + liquidityPool.usdt_sol;
            const lpTokenPrice = totalPoolValue > 0 ? totalPoolValue / liquidityPool.totalLpTokens : 0;
            return total + (amount * lpTokenPrice);
        }
        return total + (amount * price);
    }, 0);

    const pnlValue = currentPortfolioValue - initialValue;
    const pnlPercentage = initialValue > 0 ? (pnlValue / initialValue) * 100 : 0;
    
    return { value: pnlValue, percentage: pnlPercentage };
  }, [isPaperTrading, paperState.balances, assetPrices, liquidityPool]);

  const realPnl = useMemo<PaperPnl>(() => {
    if (isPaperTrading || initialRealValueRef.current === null) return { value: 0, percentage: 0 };
    
    const initialValue = initialRealValueRef.current;
    
    const currentPortfolioValue = Object.entries(realState.balances).reduce((total, [asset, amount]) => {
        const priceKey = asset.toUpperCase().split('_')[0]; 
        const price = assetPrices[priceKey] || (asset.includes('usdt') ? 1 : 0);

        if (asset.toLowerCase() === 'gdp') {
            const totalPoolValue = liquidityPool.usdt + liquidityPool.usdt_sol;
            const lpTokenPrice = totalPoolValue > 0 ? totalPoolValue / liquidityPool.totalLpTokens : 0;
            return total + (amount * lpTokenPrice);
        }
        return total + (amount * price);
    }, 0);

    const pnlValue = currentPortfolioValue - initialValue;
    const pnlPercentage = initialValue > 0 ? (pnlValue / initialValue) * 100 : 0;
    
    return { value: pnlValue, percentage: pnlPercentage };
  }, [isPaperTrading, realState.balances, assetPrices, liquidityPool]);


  // DeFi State Logic (Supplying, Borrowing, Staking)
  const modifyDeFiBalance = useCallback((
    asset: keyof Balances, amount: number,
    source: 'balances' | 'suppliedAssets' | 'borrowedAssets' | 'stakedGdp',
    destination: 'balances' | 'suppliedAssets' | 'borrowedAssets' | 'stakedGdp'
  ) => {
    setState(prev => {
        const newState = { ...prev };
        const update = (obj: any, key: string, delta: number) => {
            obj[key] = (obj[key] || 0) + delta;
        };
        const sourceMap = { balances: newState.balances, suppliedAssets: newState.suppliedAssets, borrowedAssets: newState.borrowedAssets };
        const destMap = { balances: newState.balances, suppliedAssets: newState.suppliedAssets, borrowedAssets: newState.borrowedAssets };

        if (source === 'stakedGdp') newState.stakedGdp -= amount; else update(sourceMap[source], asset, -amount);
        if (destination === 'stakedGdp') newState.stakedGdp += amount; else update(destMap[destination], asset, amount);
        
        return newState;
    });
  }, [setState]);

  const supplyAsset = (asset: keyof Balances, amount: number) => modifyDeFiBalance(asset, amount, 'balances', 'suppliedAssets');
  const withdrawAsset = (asset: keyof Balances, amount: number) => modifyDeFiBalance(asset, amount, 'suppliedAssets', 'balances');
  const borrowAsset = (asset: keyof Balances, amount: number) => modifyDeFiBalance(asset, amount, 'balances', 'borrowedAssets');
  const repayAsset = (asset: keyof Balances, amount: number) => modifyDeFiBalance(asset, amount, 'borrowedAssets', 'balances');
  const stakeGdp = (amount: number) => modifyDeFiBalance('gdp', amount, 'balances', 'stakedGdp');
  const unstakeGdp = (amount: number) => modifyDeFiBalance('gdp', amount, 'stakedGdp', 'balances');
  const claimGdpRewards = () => {
    setState(prev => {
      if (prev.gdpRewards <= 0) return prev;
      return {
        ...prev,
        balances: { ...prev.balances, usdt: prev.balances.usdt + prev.gdpRewards },
        gdpRewards: 0,
      };
    });
  };

  // Effect for generating staking rewards
  useEffect(() => {
    if (stakedGdp <= 0) return;
    const interval = setInterval(() => {
      const rewardsPerSecond = (stakedGdp * STAKING_APY / 100) / (365 * 24 * 60 * 60);
      setState(prev => ({
        ...prev,
        gdpRewards: prev.gdpRewards + rewardsPerSecond * 5 // Update every 5 seconds
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, [stakedGdp, setState]);

  return (
    <TradeHistoryContext.Provider value={{
      balances, availableBalances, openOrders, orderHistory, futuresPositions, marketMakerBots,
      isPaperTrading, paperPnl, realPnl, toggleTradeMode, resetPaperAccount, placeOrder, cancelOrder,
      openFuturesPosition, closeFuturesPosition, liquidityPool, bridgeAssets, addLiquidity, removeLiquidity,
      createMarketMakerBot, toggleMarketMakerBot, removeMarketMakerBot,
      lendingMarket, suppliedAssets, borrowedAssets, stakedGdp, gdpRewards, stakingApy: STAKING_APY,
      supplyAsset, withdrawAsset, borrowAsset, repayAsset, stakeGdp, unstakeGdp, claimGdpRewards
    }}>
      {children}
    </TradeHistoryContext.Provider>
  );
};