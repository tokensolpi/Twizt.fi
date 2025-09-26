
import React from 'react';
import { useMarketData } from '../contexts/MarketDataContext';
import { OrderType } from '../types';

const RecentTrades: React.FC = () => {
  const { marketData: { trades, price }, currentPair } = useMarketData();
  const [baseAsset, quoteAsset] = currentPair.split('/');
  const priceDecimalPlaces = price > 10 ? 2 : 6;

  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
      <h3 className="text-white font-semibold mb-2 text-base">Recent Trades</h3>
      <div className="grid grid-cols-3 text-xs text-brand-secondary mb-2 px-1">
        <span>Price ({quoteAsset})</span>
        <span className="text-right">Amount ({baseAsset})</span>
        <span className="text-right">Time</span>
      </div>
      <div className="space-y-1 overflow-y-auto h-48">
        {trades.map((trade, index) => (
          <div key={index} className="grid grid-cols-3 text-xs font-mono px-1">
            <span className={trade.type === OrderType.BUY ? 'text-green-400' : 'text-red-400'}>
              {trade.price.toFixed(priceDecimalPlaces)}
            </span>
            <span className="text-right text-white">{trade.amount.toFixed(4)}</span>
            <span className="text-right text-brand-secondary">{trade.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentTrades;