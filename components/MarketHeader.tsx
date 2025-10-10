import React, { useState, useEffect, useRef } from 'react';
import { useMarketData } from '../contexts/MarketDataContext';
import { TRADING_PAIRS } from '../constants';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';

const MarketHeader: React.FC = () => {
  const { marketData, currentPair, setCurrentPair } = useMarketData();
  const { 
    price: markPrice, 
    indexPrice,
    price_24h_change, 
    price_24h_change_percent, 
    openInterest,
    fundingRate,
    nextFundingTime,
  } = marketData;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [countdown, setCountdown] = useState('');

  // Countdown timer effect
  useEffect(() => {
    if (!nextFundingTime) return;

    const intervalId = setInterval(() => {
        const now = Date.now();
        const diff = nextFundingTime - now;

        if (diff <= 0) {
            setCountdown('00:00:00');
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setCountdown(
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
    }, 1000);

    return () => clearInterval(intervalId);
  }, [nextFundingTime]);


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

  const [baseAsset] = currentPair.split('/');
  const priceDecimalPlaces = markPrice > 10 ? 2 : 6;
  
  const assetNames: { [key: string]: string } = {
    'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'SOL': 'Solana', 'LINK': 'Chainlink', 'USDT': 'Tether'
  };


  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg p-4 flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-start gap-4">
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2"
          >
            <h1 className="text-brand-text-primary text-xl font-bold">{currentPair}-PERP</h1>
            <svg className={`w-4 h-4 text-brand-secondary transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
          <p className="text-xs text-brand-secondary">{assetNames[baseAsset]} Perpetual</p>
          
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-brand-surface border border-brand-border rounded-md shadow-lg z-10">
              {TRADING_PAIRS.map(pair => (
                <button 
                  key={pair}
                  onClick={() => handlePairSelect(pair)}
                  className={`w-full text-left px-4 py-2 text-sm ${currentPair === pair ? 'text-brand-primary' : 'text-brand-text-primary'} hover:bg-brand-border`}
                >
                  {pair}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div>
          <p className="text-brand-text-primary text-xl font-mono">{markPrice.toLocaleString('en-US', { minimumFractionDigits: priceDecimalPlaces, maximumFractionDigits: priceDecimalPlaces })}</p>
          <p className={`flex items-center text-sm ${isPositiveChange ? 'text-brand-green' : 'text-brand-red'}`}>
            {isPositiveChange ? <ArrowUpIcon /> : <ArrowDownIcon />} 
            {isPositiveChange ? '+' : ''}{price_24h_change.toFixed(priceDecimalPlaces)} ({isPositiveChange ? '+' : ''}{price_24h_change_percent.toFixed(2)}%)
          </p>
        </div>
      </div>
      
      <div className='flex gap-4 items-center flex-wrap text-xs sm:text-sm text-right'>
         <div>
            <p className="text-brand-secondary">Index Price</p>
            <p className="text-brand-text-primary font-mono">{indexPrice.toLocaleString('en-US', { minimumFractionDigits: priceDecimalPlaces, maximumFractionDigits: priceDecimalPlaces })}</p>
        </div>
        <div>
            <p className="text-brand-secondary">Open Interest</p>
            <p className="text-brand-text-primary font-mono">{openInterest.toFixed(2)} {baseAsset}</p>
        </div>
        <div>
            <p className="text-brand-secondary">Funding / Countdown</p>
            <p className={`font-mono ${fundingRate >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
              {(fundingRate * 100).toFixed(4)}% <span className="text-brand-text-primary">/ {countdown}</span>
            </p>
        </div>
      </div>
    </div>
  );
};

export default MarketHeader;