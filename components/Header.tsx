import React, { useState } from 'react';
import { LogoIcon } from './icons/LogoIcon';
import { useTradeHistory } from '../contexts/TradeHistoryContext';

const Header: React.FC = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const { isPaperTrading, toggleTradeMode, paperPnl, resetPaperAccount } = useTradeHistory();

  const handleConnectWallet = () => {
    // Simulate a wallet connection with a placeholder message
    alert('Wallet connected successfully! (Simulation)');
    setIsWalletConnected(true);
  };
  
  const isPnlPositive = paperPnl.value >= 0;

  return (
    <header className="bg-brand-surface border-b border-brand-border p-4">
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
          {isPaperTrading && (
            <div className="flex items-center gap-3 bg-brand-bg px-3 py-1.5 rounded-md border border-brand-primary/50">
              <div>
                <span className="text-xs text-brand-secondary block">Paper Trading PNL</span>
                <p className={`text-sm font-mono font-semibold ${isPnlPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPnlPositive ? '+' : ''}{paperPnl.value.toFixed(2)} USDT ({isPnlPositive ? '+' : ''}{paperPnl.percentage.toFixed(2)}%)
                </p>
              </div>
              <button onClick={resetPaperAccount} className="text-xs text-brand-secondary hover:text-brand-red transition-colors">Reset</button>
            </div>
          )}

          <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${!isPaperTrading ? 'text-white' : 'text-brand-secondary'}`}>Live</span>
              <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={isPaperTrading} onChange={toggleTradeMode} className="sr-only peer" />
                  <div className="w-9 h-5 bg-brand-bg border border-brand-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-brand-secondary after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-white"></div>
              </label>
              <span className={`text-xs font-semibold ${isPaperTrading ? 'text-brand-primary' : 'text-brand-secondary'}`}>Paper</span>
          </div>

          <button
            onClick={handleConnectWallet}
            disabled={isWalletConnected}
            className={`text-white text-sm font-semibold px-4 py-2 rounded-md transition-all hidden sm:block ${
              isWalletConnected
                ? 'bg-brand-green cursor-default'
                : 'bg-brand-primary hover:bg-opacity-90'
            }`}
          >
            {isWalletConnected ? 'Wallet Connected' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;