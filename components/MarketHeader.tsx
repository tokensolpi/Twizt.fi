


import React, { useState, useEffect, useRef } from 'react';
import { useMarketData } from '../contexts/MarketDataContext';
import { TRADING_PAIRS } from '../constants';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';

const MarketHeader: React.FC = () => {
  const { marketData, currentPair, setCurrentPair } = useMarketData();
  const { 
    price, 
    price_24h_change, 
    price_24h_change_percent, 
    high_24h, 
    low_24h 
  } = marketData;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isPositiveChange = price_24h_change >= 0;
  
  const handlePairSelect = (pair: string) => {
    setCurrentPair(pair);
    setIsDropdownOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [baseAsset, quoteAsset] = currentPair.split('/');
  const priceDecimalPlaces = price > 10 ? 2 : 6;
  const changeDecimalPlaces = price > 10 ? 2 : 6;

  const assetNames: { [key: string]: string } = {
    'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'SOL': 'Solana', 'BNB': 'BNB', 'DOGE': 'Dogecoin', 'USDT': 'Tether'
  };


  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg p-4 flex items-center justify-between flex-wrap gap-4">
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2"
        >
          <h1 className="text-white text-xl font-bold">{currentPair}</h1>
          <svg className={`w-4 h-4 text-brand-secondary transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>
        <p className="text-xs text-brand-secondary">{assetNames[baseAsset]} / {assetNames[quoteAsset]}</p>
        
        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-brand-surface border border-brand-border rounded-md shadow-lg z-10">
            {TRADING_PAIRS.map(pair => (
              <button 
                key={pair}
                onClick={() => handlePairSelect(pair)}
                className={`w-full text-left px-4 py-2 text-sm ${currentPair === pair ? 'text-brand-primary' : 'text-white'} hover:bg-brand-border`}
              >
                {pair}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className='flex gap-4 items-center flex-wrap text-sm'>
        <div>
          <p className="text-white text-lg font-mono">{price.toLocaleString('en-US', { minimumFractionDigits: priceDecimalPlaces, maximumFractionDigits: priceDecimalPlaces })}</p>
          <p className={`flex items-center ${isPositiveChange ? 'text-brand-green' : 'text-brand-red'}`}>
            {isPositiveChange ? <ArrowUpIcon /> : <ArrowDownIcon />} 
            {isPositiveChange ? '+' : ''}{price_24h_change.toFixed(changeDecimalPlaces)} ({isPositiveChange ? '+' : ''}{price_24h_change_percent.toFixed(2)}%)
          </p>
        </div>
        <div className="hidden sm:flex gap-4 items-center divide-x divide-brand-border">
          <div className="pl-4">
              <p className="text-xs text-brand-secondary">24h High</p>
              <p className="text-white font-mono">{high_24h.toLocaleString('en-US', { minimumFractionDigits: priceDecimalPlaces, maximumFractionDigits: priceDecimalPlaces })}</p>
          </div>
          <div className="pl-4">
              <p className="text-xs text-brand-secondary">24h Low</p>
              <p className="text-white font-mono">{low_24h.toLocaleString('en-US', { minimumFractionDigits: priceDecimalPlaces, maximumFractionDigits: priceDecimalPlaces })}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketHeader;