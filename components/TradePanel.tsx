
import React, { useState, useMemo, useEffect } from 'react';
import { OrderType, PositionSide } from '../types';
import { useMarketData } from '../contexts/MarketDataContext';
import { useTradeHistory } from '../contexts/TradeHistoryContext';

type TradeMode = 'spot' | 'futures';

const TradePanel: React.FC = () => {
  const { marketData: { price: marketPrice }, currentPair } = useMarketData();
  const { availableBalances, placeOrder, openFuturesPosition } = useTradeHistory();

  const [baseAsset, quoteAsset] = useMemo(() => currentPair.split('/'), [currentPair]);
  const baseAssetLower = baseAsset.toLowerCase();

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
      setPrice(marketPrice.toFixed(marketPrice > 10 ? 2 : 6));
    }
    setAmount('');
    setError(null);
  }, [marketPrice, currentPair]);

  const { total, margin, liquidationPrice } = useMemo(() => {
    const priceNum = parseFloat(price);
    const amountNum = parseFloat(amount);
    if (isNaN(priceNum) || isNaN(amountNum) || priceNum <= 0 || amountNum <= 0) {
      return { total: '0.00', margin: '0.00', liquidationPrice: '0.00' };
    }
    const totalVal = priceNum * amountNum;
    const marginVal = totalVal / leverage;
    
    const liqPrice = activeTab === OrderType.BUY
      ? priceNum * (1 - (1 / leverage))
      : priceNum * (1 + (1 / leverage));
      
    return {
      total: totalVal.toFixed(2),
      margin: marginVal.toFixed(2),
      liquidationPrice: liqPrice.toFixed(liqPrice > 10 ? 2 : 6)
    };
  }, [price, amount, leverage, activeTab]);

  const handlePercentage = (percentage: number) => {
    setError(null);
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) return;

    if (tradeMode === 'spot') {
        if (activeTab === OrderType.BUY) {
            const totalValue = availableBalances.usdt * (percentage / 100);
            const amountToSet = totalValue / priceNum;
            setAmount(amountToSet.toFixed(6));
        } else { // SELL
            const baseBalance = (availableBalances as any)[baseAssetLower] || 0;
            const amountToSet = baseBalance * (percentage / 100);
            setAmount(amountToSet.toFixed(6));
        }
    } else { // Futures
        // For both long and short, the position size is determined by the margin (USDT) you commit.
        const marginToUse = availableBalances.usdt * (percentage / 100);
        const positionValue = marginToUse * leverage;
        const amountToSet = positionValue / priceNum;
        setAmount(amountToSet.toFixed(6));
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
      const baseBalance = (availableBalances as any)[baseAssetLower] || 0;
      if (activeTab === OrderType.BUY) {
          if (totalNum > availableBalances.usdt) {
            setError(`Insufficient ${quoteAsset} balance.`); return;
          }
      } else { // SELL
          if (amountNum > baseBalance) {
            setError(`Insufficient ${baseAsset} balance.`); return;
          }
      }
      placeOrder({ type: activeTab, price: priceNum, amount: amountNum, pair: currentPair });
    } else {
      if (marginNum > availableBalances.usdt) {
        setError("Insufficient USDT for margin."); return;
      }
      openFuturesPosition({
        side: activeTab === OrderType.BUY ? PositionSide.LONG : PositionSide.SHORT,
        price: priceNum, amount: amountNum, leverage, pair: currentPair,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      });
    }

    setAmount('');
    setStopLoss('');
    setTakeProfit('');
  };

  const isBuy = activeTab === OrderType.BUY;
  const baseBalance = (availableBalances as any)[baseAssetLower] || 0;

  const InputWithLabel: React.FC<{label: string, asset: string, value: string, onChange: (val: string) => void, placeholder?: string, id: string}> = ({label, asset, value, onChange, placeholder, id}) => (
    <div>
      <label className="text-xs text-brand-secondary mb-1 block">{label}</label>
      <div className="relative">
        <input id={id} type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-brand-bg border border-brand-border rounded-md pl-3 pr-14 py-2 text-white placeholder-brand-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono" />
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm font-semibold text-brand-secondary">{asset}</span>
      </div>
    </div>
  );


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
        <InputWithLabel id="price" label={`Price (${quoteAsset})`} asset={quoteAsset} value={price} onChange={(val) => {setPrice(val); setError(null);}} />
        <InputWithLabel id="amount" label={`Amount (${baseAsset})`} asset={baseAsset} value={amount} onChange={(val) => {setAmount(val); setError(null);}} placeholder="0.00000" />
        
        <div className="flex justify-between">
            {[25, 50, 75, 100].map(p => (
                <button key={p} onClick={() => handlePercentage(p)}
                    className="text-xs bg-brand-bg border border-brand-border rounded-md px-3 py-1 hover:bg-brand-border transition-colors w-[23%]">
                    {p}%
                </button>
            ))}
        </div>
        
        {tradeMode === 'futures' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-brand-secondary mb-1 block">Leverage: <span className="text-white font-mono">{leverage}x</span></label>
              <input type="range" min="1" max="50" step="1" value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} className="w-full h-2 bg-brand-bg rounded-lg appearance-none cursor-pointer accent-brand-primary"/>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs text-brand-secondary mb-1 block">Take Profit</label>
                    <InputWithLabel id="tp" label="" asset={quoteAsset} value={takeProfit} onChange={setTakeProfit} placeholder={`e.g., ${(marketPrice * 1.05).toFixed(0)}`} />
                </div>
                <div>
                    <label className="text-xs text-brand-secondary mb-1 block">Stop Loss</label>
                    <InputWithLabel id="sl" label="" asset={quoteAsset} value={stopLoss} onChange={setStopLoss} placeholder={`e.g., ${(marketPrice * 0.95).toFixed(0)}`} />
                </div>
            </div>
          </div>
        )}

        <div className="border-t border-brand-border pt-4 space-y-2 text-xs">
          <div className="flex justify-between text-brand-secondary">
            <span>Available</span>
            <span className="font-mono text-white">{isBuy ? `${availableBalances.usdt.toFixed(2)} ${quoteAsset}` : `${baseBalance.toFixed(6)} ${baseAsset}`}</span>
          </div>
           <div className="flex justify-between text-brand-secondary">
            <span>{tradeMode === 'futures' ? 'Margin' : 'Total'}</span>
            <span className="font-mono text-white">{tradeMode === 'futures' ? margin : total} {quoteAsset}</span>
          </div>
          {tradeMode === 'futures' && (
            <div className="flex justify-between text-brand-secondary">
              <span>Liq. Price (est.)</span>
              <span className="font-mono text-white">{liquidationPrice} {quoteAsset}</span>
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
          {isBuy ? `Buy / Long ${baseAsset}` : `Sell / Short ${baseAsset}`}
        </button>
      </div>
    </div>
  );
};

export default TradePanel;
