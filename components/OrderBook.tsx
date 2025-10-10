import React, { useState, useEffect, useRef } from 'react';
import { useMarketData } from '../contexts/MarketDataContext';
import type { OrderBookEntry } from '../types';
import { InfoIcon } from './icons/InfoIcon';

type OrderBookType = 'perps' | 'spot';

const OrderBook: React.FC = () => {
  const { marketData, currentPair } = useMarketData();
  const { futuresBids, futuresAsks, bids: spotBids, asks: spotAsks, price } = marketData;
  const [activeTab, setActiveTab] = useState<OrderBookType>('perps');
  
  const { bids, asks } = activeTab === 'perps' 
    ? { bids: futuresBids, asks: futuresAsks }
    : { bids: spotBids, asks: spotAsks };

  const [baseAsset, quoteAsset] = currentPair.split('/');
  const prevPriceRef = useRef<number>(0);
  const [priceColorClass, setPriceColorClass] = useState('text-brand-text-primary');

  useEffect(() => {
    if (typeof prevPriceRef.current !== 'undefined' && prevPriceRef.current !== 0) {
        if (price > prevPriceRef.current) {
            setPriceColorClass('text-brand-green');
        } else if (price < prevPriceRef.current) {
            setPriceColorClass('text-brand-red');
        }
    }
    const timeoutId = setTimeout(() => setPriceColorClass('text-brand-text-primary'), 500);
    prevPriceRef.current = price;

    return () => clearTimeout(timeoutId);
  }, [price]);

  const priceDecimalPlaces = price > 10 ? 2 : 6;

  const renderRow = (order: OrderBookEntry, isBid: boolean) => {
      const allTotals = [...bids.map(b => b.total), ...asks.map(a => a.total)];
      const maxTotal = Math.max(...allTotals, 0);
      const percentage = maxTotal > 0 ? (order.total / maxTotal) * 100 : 0;

      return (
        <div key={order.price} className="relative flex justify-between items-center text-xs font-mono p-1 hover:bg-brand-border/30 rounded">
            <div 
                className={`absolute top-0 right-0 h-full ${isBid ? 'bg-brand-green-light' : 'bg-brand-red-light'} transition-all duration-300`}
                style={{ width: `${percentage}%` }}
            ></div>
            <span className={`z-10 ${isBid ? 'text-green-400' : 'text-red-400'}`}>{order.price.toFixed(priceDecimalPlaces)}</span>
            <span className="z-10 text-brand-text-primary text-right">{order.amount.toFixed(4)}</span>
            <span className="z-10 text-brand-secondary text-right">{order.total.toFixed(2)}</span>
        </div>
      );
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg p-4 flex-grow flex flex-col">
       <div className="flex items-center justify-between mb-2">
            <div className="flex -mb-px">
              <button
                onClick={() => setActiveTab('perps')}
                className={`px-3 py-1.5 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === 'perps' ? 'text-brand-primary border-brand-primary' : 'text-brand-secondary border-transparent hover:text-brand-text-primary'
                }`}
              >
                Perpetuals
              </button>
              <button
                onClick={() => setActiveTab('spot')}
                className={`px-3 py-1.5 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === 'spot' ? 'text-brand-primary border-brand-primary' : 'text-brand-secondary border-transparent hover:text-brand-text-primary'
                }`}
              >
                Spot
              </button>
            </div>
            <div className="group relative flex items-center">
                <InfoIcon />
                <span className="absolute bottom-full mb-2 w-56 hidden group-hover:block bg-brand-bg text-xs text-brand-secondary p-2 rounded-md border border-brand-border z-10 shadow-lg right-0">
                    Order book and trade history are simulated. Live trading executes real on-chain approvals on Arbitrum Sepolia.
                </span>
            </div>
        </div>
      <div className="border-t border-brand-border pt-2">
        <div className="grid grid-cols-3 text-xs text-brand-secondary mb-2 px-1">
          <span>Price ({quoteAsset})</span>
          <span className="text-right">Amount ({baseAsset})</span>
          <span className="text-right">Total</span>
        </div>
        <div className="flex-grow space-y-1 overflow-y-auto">
          {/* Asks */}
          <div className='flex flex-col-reverse'>
              {asks.slice(0, 10).map(order => renderRow(order, false))}
          </div>

          <div className={`py-2 text-center text-2xl font-semibold font-mono border-t border-b border-brand-border transition-colors duration-200 ${priceColorClass}`}>
            {price.toLocaleString('en-US', { minimumFractionDigits: priceDecimalPlaces, maximumFractionDigits: priceDecimalPlaces })}
          </div>

          {/* Bids */}
          <div>
              {bids.slice(0, 10).map(order => renderRow(order, true))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderBook;