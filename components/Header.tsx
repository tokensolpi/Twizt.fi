
import React, { useState, useRef, useEffect } from 'react';
import { LogoIcon } from './icons/LogoIcon';
import { useTradeHistory } from '../contexts/TradeHistoryContext';
import { useWallet } from '../contexts/WalletContext';
import { ARBITRUM_BLOCK_EXPLORER, ARBITRUM_CHAIN_ID } from '../constants';
import GasTracker from './GasTracker';

const Header: React.FC = () => {
  const { isPaperTrading, toggleTradeMode, paperPnl, realPnl, resetPaperAccount, balances } = useTradeHistory();
  const { connectWallet, disconnectWallet, isConnected, address, wrongNetwork, l1Balance } = useWallet();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const activePnl = isPaperTrading ? paperPnl : realPnl;
  const isPnlPositive = activePnl.value >= 0;

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const WalletButton: React.FC = () => {
    if (wrongNetwork) {
      return (
         <button
            onClick={connectWallet} // This will trigger the switch network prompt
            className="text-white text-sm font-semibold px-4 py-2 rounded-md transition-all bg-brand-red hover:bg-opacity-90"
          >
            Wrong Network
          </button>
      )
    }

    if (isConnected && address) {
      return (
        <div className="relative" ref={dropdownRef}>
           <button
            onClick={() => setIsDropdownOpen(prev => !prev)}
            className="text-white text-sm font-mono px-4 py-2 rounded-md transition-all bg-brand-green flex items-center gap-2"
          >
            {truncateAddress(address)}
            <svg className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
          {isDropdownOpen && (
             <div className="absolute top-full right-0 mt-2 w-56 bg-brand-surface border border-brand-border rounded-md shadow-lg z-20 text-sm">
                <div className="px-4 py-3 border-b border-brand-border">
                  <p className="text-xs text-brand-secondary mb-1">Balances</p>
                  <div className="flex justify-between items-center">
                    <span className="text-brand-secondary">Arbitrum Sepolia:</span>
                    <span className="font-mono text-white">
                      {balances.eth.toFixed(5)} ETH
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-brand-secondary">Ethereum Sepolia:</span>
                    <span className="font-mono text-white">
                      {l1Balance ? parseFloat(l1Balance).toFixed(5) : '0.00000'} ETH
                    </span>
                  </div>
                </div>
                <a
                  href={`${ARBITRUM_BLOCK_EXPLORER}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-left px-4 py-2 text-brand-secondary hover:text-white hover:bg-brand-border/50"
                >
                  View on Explorer
                </a>
                <button
                  onClick={() => {
                    disconnectWallet();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-brand-secondary hover:text-white hover:bg-brand-border/50 rounded-b-md"
                >
                  Disconnect
                </button>
              </div>
          )}
        </div>
      );
    }
    
    return (
       <button
          onClick={connectWallet}
          className="text-white text-sm font-semibold px-4 py-2 rounded-md transition-all bg-brand-primary hover:bg-opacity-90"
        >
          Connect Wallet
        </button>
    );
  };


  return (
    <header className={`bg-brand-surface border-b border-brand-border p-4 transition-all ${!isPaperTrading ? 'border-t-4 border-brand-green' : ''}`}>
      <div className="container mx-auto flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <LogoIcon />
          <h1 className="text-white text-xl font-bold">Twizted Divergence</h1>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#" className="text-white hover:text-brand-primary transition-colors">Trade</a>
          <a href="#" className="hover:text-brand-primary transition-colors">Futures</a>
          <a href="#" className="hover:text-brand-primary transition-colors">Portfolio</a>
          <a href="https://solana.com/developers/cookbook" target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary transition-colors">Docs</a>
        </nav>

        <div className="flex items-center gap-4">
          {ARBITRUM_CHAIN_ID === '42161' && (
            <div className="hidden lg:block">
              <GasTracker />
            </div>
          )}

          <div className={`flex items-center gap-3 bg-brand-bg px-3 py-1.5 rounded-md border ${isPaperTrading ? 'border-brand-primary/50' : 'border-brand-green/50'}`}>
            <div>
              <span className="text-xs text-brand-secondary block">{isPaperTrading ? 'Paper Trading' : 'Live Account'} PNL</span>
              <p className={`text-sm font-mono font-semibold ${isPnlPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPnlPositive ? '+' : ''}{activePnl.value.toFixed(2)} USDT ({isPnlPositive ? '+' : ''}{activePnl.percentage.toFixed(2)}%)
              </p>
            </div>
            {isPaperTrading && (
              <button onClick={resetPaperAccount} className="text-xs text-brand-secondary hover:text-brand-red transition-colors">Reset</button>
            )}
          </div>

          <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${!isPaperTrading ? 'text-white' : 'text-brand-secondary'}`}>Live</span>
              <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={isPaperTrading} onChange={toggleTradeMode} className="sr-only peer" />
                  <div className="w-9 h-5 bg-brand-bg border border-brand-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-brand-secondary after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-white"></div>
              </label>
              <span className={`text-xs font-semibold ${isPaperTrading ? 'text-brand-primary' : 'text-brand-secondary'}`}>Paper</span>
          </div>
          
          <div className="hidden sm:block">
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
