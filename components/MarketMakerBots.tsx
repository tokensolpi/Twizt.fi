import React, { useState } from 'react';
import { useTradeHistory } from '../contexts/TradeHistoryContext';
import { useMarketData } from '../contexts/MarketDataContext';
import { MarketMakerBot } from '../types';

const MarketMakerBots: React.FC = () => {
  const { marketMakerBots, createMarketMakerBot, toggleMarketMakerBot, removeMarketMakerBot, availableBalances } = useTradeHistory();
  const { marketData } = useMarketData();
  
  const [isCreating, setIsCreating] = useState(false);
  const [priceRangeLower, setPriceRangeLower] = useState('');
  const [priceRangeUpper, setPriceRangeUpper] = useState('');
  const [spread, setSpread] = useState('0.5');
  const [initialUsdt, setInitialUsdt] = useState('');
  const [orderAmount, setOrderAmount] = useState('0.001');

  const handleCreateBot = () => {
    const config = {
      priceRangeLower: parseFloat(priceRangeLower),
      priceRangeUpper: parseFloat(priceRangeUpper),
      spread: parseFloat(spread),
      initialUsdt: parseFloat(initialUsdt),
      orderAmount: parseFloat(orderAmount)
    };

    if (Object.values(config).some(v => isNaN(v) || v <= 0)) {
      alert("Please fill all fields with valid positive numbers.");
      return;
    }
    if (config.priceRangeLower >= config.priceRangeUpper) {
      alert("Lower price range must be less than upper price range.");
      return;
    }
    if (config.initialUsdt > availableBalances.usdt) {
      alert("Insufficient USDT balance for initial capital.");
      return;
    }
    createMarketMakerBot(config);
    setIsCreating(false);
    // Reset form
    setPriceRangeLower('');
    setPriceRangeUpper('');
    setSpread('0.5');
    setInitialUsdt('');
  };

  const BotCard: React.FC<{ bot: MarketMakerBot }> = ({ bot }) => {
    const isOutOfRange = marketData.price < bot.priceRangeLower || marketData.price > bot.priceRangeUpper;
    const statusText = !bot.isActive ? "Inactive" : isOutOfRange ? "Out of Range" : "Active";
    const statusColor = !bot.isActive ? "bg-gray-500" : isOutOfRange ? "bg-yellow-500" : "bg-green-500";
    
    return (
      <div className="bg-brand-bg p-3 rounded-lg border border-brand-border text-xs">
        <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-white text-[10px] rounded-full ${statusColor}`}>{statusText}</span>
                <span className="font-mono text-brand-secondary">ID: ...{bot.id.slice(-4)}</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={bot.isActive} onChange={() => toggleMarketMakerBot(bot.id)} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
            </label>
        </div>
        <div className="grid grid-cols-2 gap-2 my-3 font-mono">
            <div>
                <span className="text-brand-secondary">Range (USDT)</span>
                <p className="text-brand-text-primary">{bot.priceRangeLower} - {bot.priceRangeUpper}</p>
            </div>
            <div>
                <span className="text-brand-secondary">Spread / Order Size</span>
                <p className="text-brand-text-primary">{bot.spread}% / {bot.orderAmount} BTC</p>
            </div>
             <div>
                <span className="text-brand-secondary">Inventory (USDT)</span>
                <p className="text-brand-text-primary">{bot.inventory.usdt.toFixed(2)}</p>
            </div>
             <div>
                <span className="text-brand-secondary">Inventory (BTC)</span>
                <p className="text-brand-text-primary">{bot.inventory.btc.toFixed(6)}</p>
            </div>
        </div>
        <button onClick={() => removeMarketMakerBot(bot.id)} className="text-brand-red text-[11px] hover:underline">
            Remove Bot & Reclaim Funds
        </button>
      </div>
    )
  }

  if (isCreating) {
    return (
      <div className="space-y-3">
        <h3 className="text-brand-text-primary font-semibold text-base">Create New MM Bot</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
           <div>
              <label className="text-xs text-brand-secondary mb-1 block">Lower Price Range (USDT)</label>
              <input type="number" value={priceRangeLower} onChange={e => setPriceRangeLower(e.target.value)} placeholder={`${(marketData.price * 0.95).toFixed(0)}`} className="w-full bg-brand-bg border border-brand-border rounded px-2 py-1.5 text-brand-text-primary font-mono text-xs"/>
           </div>
           <div>
              <label className="text-xs text-brand-secondary mb-1 block">Upper Price Range (USDT)</label>
              <input type="number" value={priceRangeUpper} onChange={e => setPriceRangeUpper(e.target.value)} placeholder={`${(marketData.price * 1.05).toFixed(0)}`} className="w-full bg-brand-bg border border-brand-border rounded px-2 py-1.5 text-brand-text-primary font-mono text-xs"/>
           </div>
            <div>
              <label className="text-xs text-brand-secondary mb-1 block">Spread (%)</label>
              <input type="number" value={spread} step="0.1" onChange={e => setSpread(e.target.value)} className="w-full bg-brand-bg border border-brand-border rounded px-2 py-1.5 text-brand-text-primary font-mono text-xs"/>
           </div>
           <div>
              <label className="text-xs text-brand-secondary mb-1 block">Order Amount (BTC)</label>
              <input type="number" value={orderAmount} step="0.001" onChange={e => setOrderAmount(e.target.value)} className="w-full bg-brand-bg border border-brand-border rounded px-2 py-1.5 text-brand-text-primary font-mono text-xs"/>
           </div>
           <div className="col-span-2">
               <label className="text-xs text-brand-secondary mb-1 block">Initial Capital (USDT)</label>
               <input type="number" value={initialUsdt} onChange={e => setInitialUsdt(e.target.value)} placeholder={`Available: ${availableBalances.usdt.toFixed(2)}`} className="w-full bg-brand-bg border border-brand-border rounded px-2 py-1.5 text-brand-text-primary font-mono text-xs"/>
           </div>
        </div>
        <div className="flex gap-2">
            <button onClick={handleCreateBot} className="w-full py-2 bg-brand-primary text-white rounded text-sm font-semibold">Confirm</button>
            <button onClick={() => setIsCreating(false)} className="w-full py-2 bg-brand-border text-brand-secondary rounded text-sm">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-brand-text-primary font-semibold text-base">Market Maker Bots</h3>
        <button onClick={() => setIsCreating(true)} className="px-3 py-1 bg-brand-primary text-white rounded-md text-xs font-semibold">
            + New Bot
        </button>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {marketMakerBots.length > 0 ? (
          marketMakerBots.map(bot => <BotCard key={bot.id} bot={bot} />)
        ) : (
          <p className="text-center text-sm text-brand-secondary py-8">
            No active bots. Click '+ New Bot' to create one.
          </p>
        )}
      </div>
    </div>
  );
};

export default MarketMakerBots;
