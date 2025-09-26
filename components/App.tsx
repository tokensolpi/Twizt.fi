


import React from 'react';
import Header from './Header';
import TickerTapeWidget from './TickerTapeWidget';
import TradingChart from './TradingChart';
import TradePanel from './TradePanel';
import OrderBook from './OrderBook';
import RecentTrades from './RecentTrades';
import InfoPanel from './InfoPanel';
import MarketHeader from './MarketHeader';
import { useMarketData } from '../contexts/MarketDataContext';

const App: React.FC = () => {
  const { isLoading, currentPair } = useMarketData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Connecting to EVM Oracle for {currentPair}...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-secondary font-sans animate-fade-in">
      <Header />
      <TickerTapeWidget />
      <main className="p-2 sm:p-4">
        <div className="grid grid-cols-12 gap-4">
          
          {/* Main Content: Chart and Info Panel */}
          <div className="col-span-12 lg:col-span-7 xl:col-span-6 flex flex-col gap-4">
            <MarketHeader />
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