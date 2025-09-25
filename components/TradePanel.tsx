import React, { useState, useMemo, useEffect } from 'react';
import { OrderType, PositionSide } from '../types';
import { useMarketData } from '../contexts/MarketDataContext';
import { useTradeHistory } from '../contexts/TradeHistoryContext';

type TradeMode = 'spot' | 'futures';

const TradePanel: React.FC = () => {
  const { marketData: { price: marketPrice } } = useMarketData();
  const { availableBalances, placeOrder, openFuturesPosition } = useTradeHistory();

  const [tradeMode, setTradeMode] = useState<TradeMode>('spot');
  const [activeTab, setActiveTab] = useState<OrderType>(OrderType.BUY);
  const [price, setPrice] = useState<string>(marketPrice.toFixed(2));
  const [amount, setAmount] = useState<string>('');
  const [leverage, setLeverage] = useState<number>(10);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document.activeElement?.id !== 'price') {
      setPrice(marketPrice.toFixed(2));
    }
  }, [marketPrice]);

  const { total, margin, liquidationPrice } = useMemo(() => {
    const priceNum = parseFloat(price);
    const amountNum = parseFloat(amount);
    if (isNaN(priceNum) || isNaN(amountNum) || priceNum <= 0 || amountNum <= 0) {
      return { total: '0.00', margin: '0.00', liquidationPrice: '0.00' };
    }
    const totalVal = priceNum * amountNum;
    const marginVal = totalVal / leverage;
    
    // Simplified liquidation price calculation
    const liqPrice = activeTab === OrderType.BUY // Corresponds to LONG
      ? priceNum * (1 - (1 / leverage))
      : priceNum * (1 + (1 / leverage));
      
    return {
      total: totalVal.toFixed(2),
      margin: marginVal.toFixed(2),
      liquidationPrice: liqPrice.toFixed(2)
    };
  }, [price, amount, leverage, activeTab]);

  const handlePercentage = (percentage: number) => {
    setError(null);
    const priceNum = parseFloat(price);
    if (activeTab === OrderType.BUY) { // Buy / Long
        const totalValue = availableBalances.usdt * (percentage / 100);
        if (!isNaN(priceNum) && priceNum > 0) {
            const amountToSet = tradeMode === 'futures' ? (totalValue / (priceNum / leverage)) : (totalValue / priceNum);
            setAmount(amountToSet.toFixed(6));
        }
    } else { // Sell / Short
        const btcAmount = availableBalances.btc * (percentage / 100);
        setAmount(btcAmount.toFixed(6));
    }
  };

  const handleSubmit = () => {
    setError(null);
    const priceNum = parseFloat(price);
    const amountNum = parseFloat(amount);
    const totalNum = parseFloat(total);
    const marginNum = parseFloat(margin);

    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Price must be a positive number."); return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number."); return;
    }

    if (tradeMode === 'spot') {
      // Spot validation
      if (activeTab === OrderType.BUY) {
          const maxBuyPrice = marketPrice * 1.05;
          if (priceNum > maxBuyPrice) {
              setError(`Max buy price is ${maxBuyPrice.toFixed(2)} (5% above market).`); return;
          }
          if (totalNum > availableBalances.usdt) {
            setError("Insufficient USDT balance."); return;
          }
      } else { // SELL
          const minSellPrice = marketPrice * 0.95;
          if (priceNum < minSellPrice) {
              setError(`Min sell price is ${minSellPrice.toFixed(2)} (5% below market).`); return;
          }
          if (amountNum > availableBalances.btc) {
            setError("Insufficient BTC balance."); return;
          }
      }
      placeOrder({ type: activeTab, price: priceNum, amount: amountNum });
    } else {
      // Futures validation
      if (marginNum > availableBalances.usdt) {
        setError("Insufficient USDT for margin."); return;
      }
      openFuturesPosition({
        side: activeTab === OrderType.BUY ? PositionSide.LONG : PositionSide.SHORT,
        price: priceNum,
        amount: amountNum,
        leverage,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      });
    }

    setAmount('');
    setStopLoss('');
    setTakeProfit('');
  };

  const isBuy = activeTab === OrderType.BUY;

  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg p-4 h-full flex flex-col">
       <div className="flex justify-center border-b border-brand-border mb-4">
        <button
          onClick={() => { setTradeMode('spot'); setError(null); }}
          className={`w-1/2 py-2 text-sm font-semibold transition-colors ${
            tradeMode === 'spot' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-secondary hover:text-white'
          }`}
        >Spot</button>
        <button
          onClick={() => { setTradeMode('futures'); setError(null); }}
          className={`w-1/2 py-2 text-sm font-semibold transition-colors ${
            tradeMode === 'futures' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-secondary hover:text-white'
          }`}
        >Futures</button>
      </div>

      <div className="flex border-b border-brand-border mb-4">
        <button
          onClick={() => { setActiveTab(OrderType.BUY); setError(null); }}
          className={`w-1/2 py-2 text-center font-semibold transition-colors ${
            isBuy ? 'text-brand-green border-b-2 border-brand-green' : 'text-brand-secondary hover:text-white'
          }`}
        >{tradeMode === 'futures' ? 'Long' : 'Buy'}</button>
        <button
          onClick={() => { setActiveTab(OrderType.SELL); setError(null); }}
          className={`w-1/2 py-2 text-center font-semibold transition-colors ${
            !isBuy ? 'text-brand-red border-b-2 border-brand-red' : 'text-brand-secondary hover:text-white'
          }`}
        >{tradeMode === 'futures' ? 'Short' : 'Sell'}</button>
      </div>

      <div className="space-y-4 flex-grow">
        <div>
          <label className="text-xs text-brand-secondary mb-1 block">Price (USDT)</label>
          <input id="price" type="number" value={price} onChange={(e) => {setPrice(e.target.value); setError(null);}}
            className="w-full bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-white placeholder-brand-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono" />
        </div>
        <div>
          <label className="text-xs text-brand-secondary mb-1 block">Amount (BTC)</label>
          <input id="amount" type="number" value={amount} onChange={(e) => {setAmount(e.target.value); setError(null);}} placeholder="0.00000"
            className="w-full bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-white placeholder-brand-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono" />
        </div>
        <div className="flex justify-between">
            {[25, 50, 75, 100].map(p => (
                <button key={p} onClick={() => handlePercentage(p)}
                    className="text-xs bg-brand-bg border border-brand-border rounded-md px-3 py-1 hover:bg-brand-border transition-colors">
                    {p}%
                </button>
            ))}
        </div>
        
        {tradeMode === 'futures' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-brand-secondary mb-1 block">Leverage: <span className="text-white font-mono">{leverage}x</span></label>
              <input type="range" min="1" max="50" step="1" value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} className="w-full h-2 bg-brand-bg rounded-lg appearance-none cursor-pointer"/>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs text-brand-secondary mb-1 block">Take Profit (optional)</label>
                    <input type="number" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="e.g., 75000"
                        className="w-full bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-white placeholder-brand-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono" />
                </div>
                <div>
                    <label className="text-xs text-brand-secondary mb-1 block">Stop Loss (optional)</label>
                    <input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="e.g., 65000"
                        className="w-full bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-white placeholder-brand-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono" />
                </div>
            </div>
          </div>
        )}

        <div className="border-t border-brand-border pt-4 space-y-2 text-xs">
          <div className="flex justify-between text-brand-secondary">
            <span>Available</span>
            <span className="font-mono text-white">{isBuy ? `${availableBalances.usdt.toFixed(2)} USDT` : `${availableBalances.btc.toFixed(6)} BTC`}</span>
          </div>
           <div className="flex justify-between text-brand-secondary">
            <span>{tradeMode === 'futures' ? 'Margin' : 'Total'}</span>
            <span className="font-mono text-white">{tradeMode === 'futures' ? margin : total} USDT</span>
          </div>
          {tradeMode === 'futures' && (
            <div className="flex justify-between text-brand-secondary">
              <span>Liq. Price (est.)</span>
              <span className="font-mono text-white">{liquidationPrice} USDT</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4">
        {error && <p className="text-brand-red text-xs text-center mb-2">{error}</p>}
        <button
          onClick={handleSubmit}
          className={`w-full py-2.5 rounded-md font-semibold text-white transition-opacity ${
            isBuy ? 'bg-brand-green hover:bg-opacity-90' : 'bg-brand-red hover:bg-opacity-90'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          disabled={!parseFloat(amount) || !parseFloat(price)}
        >
          {isBuy ? `Buy / Long BTC` : `Sell / Short BTC`}
        </button>
      </div>
    </div>
  );
};

export default TradePanel;