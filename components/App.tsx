
import React from 'react';
import Header from './Header';
import TradingChart from './TradingChart';
import TradePanel from './TradePanel';
import OrderBook from './OrderBook';
import RecentTrades from './RecentTrades';
import InfoPanel from './InfoPanel';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { useMarketData } from '../contexts/MarketDataContext';

const App: React.FC = () => {
  const { marketData, isLoading } = useMarketData();
  const { 
    price, 
    price_24h_change, 
    price_24h_change_percent, 
    high_24h, 
    low_24h 
  } = marketData;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading Real-Time Market Data...</div>
      </div>
    );
  }

  const isPositiveChange = price_24h_change >= 0;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-secondary font-sans">
      <Header />
      <main className="p-2 sm:p-4">
        <div className="grid grid-cols-12 gap-4">
          
          {/* Main Content: Chart and Info Panel */}
          <div className="col-span-12 lg:col-span-7 xl:col-span-6 flex flex-col gap-4">
            <div className="bg-brand-surface border border-brand-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <h1 className="text-white text-xl font-bold">BTC/USDT</h1>
                <p className="text-xs text-brand-secondary">Bitcoin / Tether</p>
              </div>
              <div className='flex gap-4 items-center flex-wrap'>
                <div>
                  <p className="text-white text-lg font-mono">{price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className={`text-sm flex items-center ${isPositiveChange ? 'text-brand-green' : 'text-brand-red'}`}>
                    {isPositiveChange ? <ArrowUpIcon /> : <ArrowDownIcon />} 
                    {isPositiveChange ? '+' : ''}{price_24h_change.toFixed(2)} ({isPositiveChange ? '+' : ''}{price_24h_change_percent.toFixed(2)}%)
                  </p>
                </div>
                 <div>
                    <p className="text-xs text-brand-secondary">24h High</p>
                    <p className="text-white text-sm font-mono">{high_24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                 <div>
                    <p className="text-xs text-brand-secondary">24h Low</p>
                    <p className="text-white text-sm font-mono">{low_24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            <TradingChart />
            <InfoPanel />
          </div>

          {/* Side Panels: Order Book and Recent Trades */}
          <div className="col-span-12 lg:col-span-5 xl:col-span-3 flex flex-col gap-4">
            <OrderBook />
            <RecentTrades />
          </div>

          {/* Trade Execution Panel */}
          <div className="col-span-12 xl:col-span-3">
            <TradePanel />
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;